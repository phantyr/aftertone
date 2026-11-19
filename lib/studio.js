import { randomUUID } from "node:crypto";
import { getDatabase, query } from "./db.mjs";
import { InputError, releaseInput, UUID } from "./input.mjs";
import { recordActivity } from "./auth";

const admin = (actor) => actor.role === "admin";
const releaseListColumns = `r.id, r.slug, r.title, r.artist, r.genre, r.kind, r.status, r.demo, r.featured,
  r.release_date::text AS date, r.cover_id, r.downloads, r.updated_at, u.name AS owner,
  (SELECT count(*)::int FROM tracks WHERE release_id=r.id) AS track_count`;

export async function studioStats(actor) {
  const [result] = await query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status='published')::int AS live,
    count(*) FILTER (WHERE status='draft')::int AS drafts, coalesce(sum(downloads),0) AS downloads
    FROM releases WHERE ($1 OR owner_id=$2)`, [admin(actor), actor.id]);
  return result;
}

export async function studioList(actor, { status = "", search = "", page = 1, size = 20 } = {}) {
  const where = `WHERE ($1 OR r.owner_id=$2) AND ($3='' OR r.status=$3)
    AND ($4='' OR strpos(lower(concat_ws(' ',r.title,r.artist,r.genre,r.subgenre)),lower($4))>0)`;
  const values = [admin(actor), actor.id, status, search];
  const [rows, counts] = await Promise.all([
    query(`SELECT ${releaseListColumns} FROM releases r LEFT JOIN staff u ON u.id=r.owner_id ${where}
      ORDER BY r.updated_at DESC, r.id LIMIT $5 OFFSET $6`, [...values, size, (page - 1) * size]),
    query(`SELECT count(*)::int AS count FROM releases r ${where}`, values),
  ]);
  return { rows, total: counts[0].count };
}

export async function studioActivity(actor, limit = 25) {
  return query(`SELECT a.id::text, action, target_name, a.created_at, u.name AS actor
    FROM studio_activity a JOIN staff u ON u.id=a.actor_id WHERE ($1 OR a.actor_id=$2)
    ORDER BY a.id DESC LIMIT $3`, [admin(actor), actor.id, limit]);
}

export async function getStudioRelease(actor, id) {
  if (!UUID.test(id)) return null;
  const [release] = await query(`SELECT r.*, r.release_date::text AS date, m.name AS cover_name FROM releases r
    LEFT JOIN media_assets m ON m.id=r.cover_id WHERE r.id=$1 AND ($2 OR r.owner_id=$3)`, [id, admin(actor), actor.id]);
  if (!release) return null;
  const tracks = await query(`SELECT t.id, t.title, t.artist, t.duration_seconds, t.audio_id, t.preview_id, t.free_download_url,
    a.name AS audio_name, p.name AS preview_name FROM tracks t JOIN media_assets a ON a.id=t.audio_id
    LEFT JOIN media_assets p ON p.id=t.preview_id WHERE t.release_id=$1 ORDER BY t.position`, [id]);
  return {
    id: release.id, slug: release.slug, title: release.title, artist: release.artist, kind: release.kind, genre: release.genre,
    subgenre: release.subgenre,
    label: release.label, summary: release.summary, description: release.description, status: release.status, date: release.date,
    cover: release.cover_id ? { id: release.cover_id, name: release.cover_name } : null,
    featured: release.featured, demo: release.demo, revision: release.updated_at.toISOString(),
    tracks: tracks.map((track) => ({
      id: track.id, title: track.title, artist: track.artist, durationSeconds: track.duration_seconds, freeDownloadUrl: track.free_download_url,
      audio: { id: track.audio_id, name: track.audio_name },
      preview: track.preview_id ? { id: track.preview_id, name: track.preview_name } : null,
    })),
  };
}

export async function saveRelease(actor, id, input) {
  if (id && !UUID.test(id)) throw new InputError("Release not found.", 404);
  const release = releaseInput(input);
  if (release.featured && !admin(actor)) throw new InputError("Only administrators can feature releases.", 403);
  const releaseId = id || randomUUID();

  await getDatabase().begin(async (tx) => {
    // Acquire feature lock before any release row lock to keep concurrent feature changes ordered.
    if (release.featured) await query("SELECT pg_advisory_xact_lock(2917049)", [], tx);
    const [currentActor] = await query("SELECT role,active FROM staff WHERE id=$1 FOR SHARE", [actor.id], tx);
    if (!currentActor?.active || currentActor.role !== actor.role) throw new InputError("Sign in again to continue.", 403);
    const [current] = id ? await query("SELECT slug, status, owner_id, cover_id, updated_at FROM releases WHERE id=$1 FOR UPDATE", [id], tx) : [];
    if (id && (!current || (!admin(actor) && current.owner_id !== actor.id))) throw new InputError("Release not found.", 404);
    if (current && current.updated_at.toISOString() !== input.revision) throw new InputError("This release changed in another tab. Reload it before saving.", 409);

    const oldTracks = id ? await query("SELECT id,audio_id,preview_id,free_download_url FROM tracks WHERE release_id=$1", [id], tx) : [];
    const oldTrackMap = new Map(oldTracks.map((track) => [track.id, track]));
    const mediaIds = [...new Set([release.coverId, ...release.tracks.flatMap((track) => [track.audioId, track.previewId])].filter(Boolean))];
    const media = new Map((mediaIds.length ? await query("SELECT id,kind,owner_id FROM media_assets WHERE id IN (SELECT value::uuid FROM jsonb_array_elements_text($1::text::jsonb))", [JSON.stringify(mediaIds)], tx) : []).map((item) => [item.id, item]));
    const checkAsset = (assetId, kind, previousId) => {
      if (!assetId) return;
      const item = media.get(assetId);
      if (!item || item.kind !== kind || (!admin(actor) && item.owner_id !== actor.id && item.id !== previousId)) {
        throw new InputError(`Select a valid ${kind} file you own.`);
      }
    };
    checkAsset(release.coverId, "cover", current?.cover_id);
    for (const track of release.tracks) {
      const previous = oldTrackMap.get(track.id);
      if (track.id && !previous) throw new InputError("A track belongs to another release.");
      checkAsset(track.audioId, "audio", previous?.audio_id);
      checkAsset(track.previewId, "audio", previous?.preview_id);
    }

    if (release.featured) await query("UPDATE releases SET featured=false, updated_at=clock_timestamp() WHERE featured AND id<>$1", [releaseId], tx);
    const values = [releaseId, current?.slug || release.slug, release.title, release.artist, release.genre, release.kind,
      release.label, release.summary, release.description, release.date, release.coverId, release.status, release.featured, release.subgenre];
    if (id) {
      await query(`UPDATE releases SET slug=$2,title=$3,artist=$4,genre=$5,kind=$6,label=$7,summary=$8,description=$9,
        release_date=$10,cover_id=$11,status=$12,featured=$13,subgenre=$14,updated_at=clock_timestamp(),
        published_at=CASE WHEN $12='published' THEN coalesce(published_at,now()) ELSE published_at END WHERE id=$1`, values, tx);
    } else {
      await query(`INSERT INTO releases (id,slug,title,artist,genre,kind,label,summary,description,release_date,cover_id,status,featured,
        subgenre,owner_id,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,CASE WHEN $12='published' THEN now() ELSE NULL END)`, [...values, actor.id], tx);
    }

    if (id) {
      const keepIds = release.tracks.map((track) => track.id).filter(Boolean);
      await query("DELETE FROM tracks WHERE release_id=$1 AND id NOT IN (SELECT value::uuid FROM jsonb_array_elements_text($2::text::jsonb))", [id, JSON.stringify(keepIds)], tx);
    }
    for (const [index, track] of release.tracks.entries()) {
      const freeUrl = track.freeDownloadUrl ?? oldTrackMap.get(track.id)?.free_download_url ?? "";
      const trackValues = [track.id || randomUUID(), releaseId, index + 1, track.title, track.artist, track.audioId, track.previewId, track.duration, freeUrl];
      await query(`INSERT INTO tracks (id,release_id,position,title,artist,audio_id,preview_id,duration_seconds,free_download_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET position=excluded.position,title=excluded.title,
        artist=excluded.artist,audio_id=excluded.audio_id,preview_id=excluded.preview_id,duration_seconds=excluded.duration_seconds,
        free_download_url=excluded.free_download_url`, trackValues, tx);
    }

    const action = release.status === "published" && current?.status !== "published" ? "Published release"
      : release.status === "archived" && current?.status !== "archived" ? "Archived release"
      : id ? "Updated release" : "Created draft";
    await recordActivity(tx, actor, action, releaseId, release.title);
  });
  return { id: releaseId };
}
