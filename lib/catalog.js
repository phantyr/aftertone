import seed from "../content/releases.json";
import { databaseConfigured, query } from "./db.mjs";
import { UUID } from "./input.mjs";
import { releaseWindow } from "./catalog-filters.mjs";

const publicColumns = `r.id, r.slug, r.title, r.artist, r.genre, r.subgenre, r.kind, r.label, r.summary, r.description,
  r.release_date::text AS date, r.cover_id, r.downloads, r.featured, r.demo,
  t.id AS first_track, t.title AS first_title, t.artist AS first_artist, t.has_preview,
  (SELECT count(*)::int FROM tracks WHERE release_id=r.id) AS track_count`;
const firstTrack = `LEFT JOIN LATERAL (SELECT tr.id,tr.title,tr.artist,(p.track_id IS NOT NULL) AS has_preview
  FROM tracks tr LEFT JOIN track_public_previews p ON p.track_id=tr.id
  WHERE tr.release_id=r.id ORDER BY (p.track_id IS NULL),tr.position LIMIT 1) t ON true`;
const featuredDemo = seed.find((release) => release.featured);

export const GENRES = ["Techno", "House", "Drum & Bass", "Ambient", "Breaks", "Trance", "Progressive House", "Electro", "Downtempo"];
export const PAGE_SIZE = 16;

const demo = seed.map((item) => ({
  ...item, download: `/downloads/${item.slug}`, id: item.slug, date: item.date, kind: "Single", label: "Aftertone Archive", head: item.hero || item.cover,
  summary: item.tagline, downloads: 0, trackCount: 1,
  firstTrack: {
    id: item.slug, position: 1, title: item.title, artist: item.artist, cover: item.cover,
    releaseSlug: item.slug, format: item.format, durationSeconds: 24, preview: item.preview, download: `/api/tracks/${item.slug}/download`,
  },
}));

function publicRelease(row) {
  const cover = row.cover_id ? `/api/media/${row.cover_id}` : "/art/night-signal.webp";
  return {
    id: row.id, slug: row.slug, title: row.title, artist: row.artist, genre: row.genre, subgenre: row.subgenre, kind: row.kind, label: row.label,
    summary: row.summary, description: row.description, date: row.date, cover, downloads: Number(row.downloads),
    trackCount: row.track_count, featured: row.featured, demo: row.demo,
    head: row.demo && row.slug === featuredDemo?.slug ? featuredDemo.hero : cover,
    firstTrack: row.first_track ? {
      id: row.first_track, title: row.first_title, artist: row.first_artist || row.artist, cover, releaseSlug: row.slug,
      preview: row.has_preview ? `/api/tracks/${row.first_track}/preview` : null, download: `/api/tracks/${row.first_track}/download`,
    } : null,
  };
}

export function formatTime(seconds = 0) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const sorts = {
  latest: "r.release_date DESC, r.id",
  popular: "r.downloads DESC, r.release_date DESC, r.id",
  oldest: "r.release_date ASC, r.id",
  az: "lower(r.title), r.id",
};

export async function featuredRelease() {
  if (!databaseConfigured()) return demo.find((item) => item.featured) || demo[0];
  const [row] = await query(`SELECT ${publicColumns} FROM releases r ${firstTrack}
    WHERE r.status='published' ORDER BY r.featured DESC, ${sorts.latest} LIMIT 1`);
  return row ? publicRelease(row) : null;
}

const latestFirst = (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
const demoOrders = {
  latest: latestFirst,
  popular: (a, b) => b.downloads - a.downloads || latestFirst(a, b),
  oldest: (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  az: (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
};

export async function getDownloadChart() {
  if (!databaseConfigured()) return [...demo].sort(demoOrders.popular).slice(0, 4);
  const rows = await query(`SELECT r.slug,r.title,r.artist,r.cover_id FROM releases r
    WHERE r.status='published' ORDER BY ${sorts.popular} LIMIT 4`);
  return rows.map((row) => ({
    ...row, cover: row.cover_id ? `/api/media/${row.cover_id}` : "/art/night-signal.webp",
  }));
}

export async function getLabels() {
  if (databaseConfigured()) {
    return query(`SELECT min(trim(label)) AS name, count(*)::int AS count
      FROM releases WHERE status='published' AND trim(label)<>''
      GROUP BY lower(trim(label)) ORDER BY lower(trim(label))`);
  }
  const labels = new Map();
  for (const release of demo) {
    const name = release.label.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = labels.get(key) || { name, count: 0 };
    entry.count++;
    labels.set(key, entry);
  }
  return [...labels.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function browse({ q = "", genre = "", subgenre = "", label = "", kind = "", released = "", sort = "latest", page = 1, pageSize = PAGE_SIZE }) {
  const [start, end] = releaseWindow(released);
  if (!databaseConfigured()) {
    const genres = [...new Set(demo.map((item) => item.genre))].map((name) => ({
      genre: name,
      count: demo.filter((item) => item.genre === name).length,
    })).sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
    const subgenres = [...new Set(demo.filter((item) => !genre || item.genre === genre).map((item) => item.subgenre).filter(Boolean))].sort();
    const results = demo.filter((release) => (!genre || release.genre === genre)
      && (!subgenre || release.subgenre === subgenre) && (!kind || release.kind === kind)
      && (!label || release.label.trim().toLowerCase() === label.toLowerCase())
      && (!start || (release.date >= start && release.date <= end))
      && `${release.title} ${release.artist} ${release.genre} ${release.subgenre} ${release.label}`.toLowerCase().includes(q.toLowerCase()));
    results.sort(Object.hasOwn(demoOrders, sort) ? demoOrders[sort] : latestFirst);
    return { items: results.slice((page - 1) * pageSize, page * pageSize), total: results.length, genres, subgenres, labels: await getLabels() };
  }
  const where = `WHERE r.status='published' AND ($1='' OR r.genre=$1) AND ($2='' OR r.subgenre=$2) AND ($3='' OR r.kind=$3)
    AND ($4='' OR strpos(lower(concat_ws(' ', r.title,r.artist,r.genre,r.subgenre,r.label)),lower($4))>0
      OR EXISTS (SELECT 1 FROM tracks s WHERE s.release_id=r.id AND strpos(lower(concat_ws(' ',s.title,s.artist)),lower($4))>0))
    AND ($5::date IS NULL OR r.release_date BETWEEN $5::date AND $6::date)
    AND ($7::text='' OR lower(trim(r.label))=lower($7::text))`;
  const values = [genre, subgenre, kind, q, start, end, label];
  const order = Object.hasOwn(sorts, sort) ? sorts[sort] : sorts.latest;
  const [items, total, genres, subgenres, labels] = await Promise.all([
    query(`SELECT ${publicColumns} FROM releases r ${firstTrack} ${where} ORDER BY ${order} LIMIT $8 OFFSET $9`,
      [...values, pageSize, (page - 1) * pageSize]),
    query(`SELECT count(*)::int AS count FROM releases r ${where}`, values),
    query(`SELECT genre, count(*)::int AS count FROM releases WHERE status='published' GROUP BY genre ORDER BY count DESC, genre`),
    query(`SELECT DISTINCT subgenre FROM releases WHERE status='published' AND subgenre<>'' AND ($1='' OR genre=$1) ORDER BY subgenre`, [genre]),
    getLabels(),
  ]);
  return { items: items.map(publicRelease), total: total[0].count, genres, subgenres: subgenres.map((item) => item.subgenre), labels };
}

export async function getPublicRelease(slug) {
  if (!databaseConfigured()) {
    const item = demo.find((release) => release.slug === slug);
    return item ? { ...item, tracks: [item.firstTrack], related: demo.filter((other) => other.slug !== slug && other.genre === item.genre).slice(0, 4) } : null;
  }
  const [row] = await query(`SELECT ${publicColumns} FROM releases r ${firstTrack} WHERE r.status='published' AND r.slug=$1`, [slug]);
  if (!row) return null;
  const release = publicRelease(row);
  const [tracks, related] = await Promise.all([
    query(`SELECT t.id, t.position, t.title, t.artist, t.duration_seconds, m.name, (p.track_id IS NOT NULL) AS has_preview
      FROM tracks t JOIN media_assets m ON m.id=t.audio_id LEFT JOIN track_public_previews p ON p.track_id=t.id
      WHERE t.release_id=$1 ORDER BY t.position`, [row.id]),
    query(`SELECT ${publicColumns} FROM releases r ${firstTrack} WHERE r.status='published' AND r.id<>$1
      ORDER BY (r.genre=$2) DESC, ${sorts.latest} LIMIT 4`, [row.id, row.genre]),
  ]);
  return {
    ...release, related: related.map(publicRelease),
    tracks: tracks.map((track) => ({
      id: track.id, position: track.position, title: track.title, artist: track.artist || row.artist, cover: release.cover,
      releaseSlug: slug, format: track.name.split(".").at(-1).toUpperCase(), durationSeconds: track.duration_seconds,
      preview: track.has_preview ? `/api/tracks/${track.id}/preview` : null, download: `/api/tracks/${track.id}/download`,
    })),
  };
}

export async function getSaved(ids) {
  if (!databaseConfigured()) return demo.filter((item) => ids.includes(item.id));
  const safeIds = ids.filter((id) => typeof id === "string" && UUID.test(id));
  if (!safeIds.length) return [];
  const rows = await query(`SELECT ${publicColumns} FROM releases r ${firstTrack} WHERE r.status='published'
    AND r.id IN (SELECT value::uuid FROM jsonb_array_elements_text($1::text::jsonb))`, [JSON.stringify(safeIds)]);
  return rows.map(publicRelease);
}

export async function getDownloadInfo(id) {
  if (!databaseConfigured()) {
    const item = demo.find((entry) => entry.slug === id);
    return item ? { id, title: item.title, artist: item.artist, slug: item.slug, cover: item.cover, free_download_url: "" } : null;
  }
  if (!UUID.test(id)) return null;
  const [track] = await query(`SELECT t.id,t.title,coalesce(nullif(t.artist,''),r.artist) AS artist,
    r.slug,r.cover_id,t.free_download_url,t.release_id FROM tracks t JOIN releases r ON r.id=t.release_id
    WHERE t.id=$1 AND r.status='published'`, [id]);
  return track ? { ...track, cover: track.cover_id ? `/api/media/${track.cover_id}` : "/art/night-signal.webp" } : null;
}
