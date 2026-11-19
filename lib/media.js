import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { databaseConfigured, getDatabase, query } from "./db.mjs";
import { InputError, UUID, textInput } from "./input.mjs";
import { attachmentHeader, MEDIA_LIMITS, mediaType, parseRange } from "./media-core.mjs";

const mediaDirectory = () => resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIRECTORY || "./data/media");

export async function saveUpload(request, actor) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "cover" && kind !== "audio") throw new InputError("Select the type of file.");
  const original = textInput(params.get("name"), "File name", 200, true);
  const name = basename(original.replaceAll("\\", "/")).replace(/[\u0000-\u001f\u007f]/g, "_");
  const { mime, matches, extension } = mediaType(name, kind);
  const limit = MEDIA_LIMITS[kind];
  if (!request.body) throw new InputError("Select a file to upload.");
  if (Number(request.headers.get("content-length")) > limit) throw new InputError(`Files can be up to ${limit / 1024 / 1024} MB.`, 413);
  const id = randomUUID();
  const key = id + extension;
  const folder = mediaDirectory();
  const filePath = join(/* turbopackIgnore: true */ folder, key);

  let written = 0;
  let signature = Buffer.alloc(0);
  const inspect = new Transform({
    transform(chunk, encoding, callback) {
      written += chunk.length;
      if (written > limit) return callback(new InputError(`Files can be up to ${limit / 1024 / 1024} MB.`, 413));
      if (signature.length < 16) signature = Buffer.concat([signature, chunk.subarray(0, 16 - signature.length)]);
      callback(null, chunk);
    },
  });

  await mkdir(folder, { recursive: true });
  try {
    await pipeline(Readable.fromWeb(request.body), inspect, createWriteStream(filePath, { flags: "wx" }));
    if (!written || !matches(signature)) throw new InputError("The contents do not match the file extension.", 415);
    await query(`INSERT INTO media_assets (id,owner_id,kind,storage,storage_key,name,mime,size_bytes)
      VALUES ($1,$2,$3,'local',$4,$5,$6,$7)`, [id, actor.id, kind, key, name, mime, written]);
  } catch (error) {
    if (error.code !== "EEXIST") await rm(filePath, { force: true });
    throw error;
  }
  return { id, name, size: written, url: kind === "cover" ? `/api/media/${id}` : undefined };
}

export async function visibleAsset(id, staff) {
  if (!databaseConfigured() || !UUID.test(id)) return null;
  const [asset] = await query(`SELECT m.* FROM media_assets m WHERE m.id=$1 AND (
    $2 OR m.owner_id=$3 OR (m.kind='cover' AND EXISTS (SELECT 1 FROM releases WHERE cover_id=m.id AND (status='published' OR owner_id=$3)))
    OR EXISTS (SELECT 1 FROM tracks t JOIN releases r ON r.id=t.release_id WHERE r.owner_id=$3 AND (t.audio_id=m.id OR t.preview_id=m.id)))`,
    [id, staff?.role === "admin", staff?.id || null]);
  return asset || null;
}

export async function trackAsset(id, download) {
  if (!databaseConfigured() || !UUID.test(id)) return null;
  const source = download ? "JOIN media_assets m ON m.id=t.audio_id" :
    "JOIN track_public_previews p ON p.track_id=t.id JOIN media_assets m ON m.id=p.asset_id";
  const [asset] = await query(`SELECT m.*, t.release_id
    FROM tracks t JOIN releases r ON r.id=t.release_id
    ${source} WHERE t.id=$1 AND r.status='published' AND m.kind='audio'`, [id]);
  return asset ? { ...asset, publicExcerpt: !download } : null;
}

function getAssetPath(asset) {
  if (asset.storage === "demo" && /^(?:art|audio)\/[a-z0-9-]+\.[a-z0-9]+$/.test(asset.storage_key)) {
    if (asset.kind === "audio" && !asset.publicExcerpt) {
      return join(/* turbopackIgnore: true */ process.cwd(), "content", "demo-audio", basename(asset.storage_key));
    }
    return join(process.cwd(), "public", asset.storage_key);
  }
  if (asset.storage === "local" && /^[a-f0-9-]+\.[a-z0-9]+$/.test(asset.storage_key)) {
    return join(/* turbopackIgnore: true */ mediaDirectory(), asset.storage_key);
  }
  throw new InputError("Media not found.", 404);
}

export async function sendAsset(request, asset, download = false) {
  if (!asset) throw new InputError("Media not found.", 404);
  const path = getAssetPath(asset);
  const info = await stat(/* turbopackIgnore: true */ path).catch((error) => {
    if (error.code === "ENOENT") throw new InputError("Media file is missing.", 404);
    throw error;
  });
  const rangeHeader = request.headers.get("range");
  const range = rangeHeader ? parseRange(rangeHeader, info.size) : null;
  const headers = new Headers({
    "Content-Type": asset.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": download || (asset.kind === "audio" && !asset.publicExcerpt) ? "private, no-store" : "private, no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (rangeHeader && !range) {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set("Content-Length", String(range ? range.end - range.start + 1 : info.size));
  if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
  if (download) headers.set("Content-Disposition", attachmentHeader(asset.name));

  return new Response(request.method === "HEAD" ? null : Readable.toWeb(createReadStream(/* turbopackIgnore: true */ path, range || undefined)), {
    status: range ? 206 : 200, headers,
  });
}

export async function countDownload(trackId, releaseId) {
  await getDatabase().begin(async (tx) => {
    await query("UPDATE releases SET downloads=downloads+1 WHERE id=$1", [releaseId], tx);
    await query("UPDATE tracks SET downloads=downloads+1 WHERE id=$1 AND release_id=$2", [trackId, releaseId], tx);
  });
}
