import { extname } from "node:path";
import { InputError } from "./input.mjs";

export const MEDIA_LIMITS = { cover: 15 * 1024 * 1024, audio: 120 * 1024 * 1024 };

const types = {
  ".jpg": ["cover", "image/jpeg", (b) => b[0] === 255 && b[1] === 216 && b[2] === 255],
  ".jpeg": ["cover", "image/jpeg", (b) => b[0] === 255 && b[1] === 216 && b[2] === 255],
  ".png": ["cover", "image/png", (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
  ".webp": ["cover", "image/webp", (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP"],
  ".mp3": ["audio", "audio/mpeg", (b) => b.toString("ascii", 0, 3) === "ID3" || (b.length >= 3 && b[0] === 255 && (b[1] & 224) === 224 && (b[1] & 6) !== 0)],
  ".wav": ["audio", "audio/wav", (b) => ["RIFF", "RF64"].includes(b.toString("ascii", 0, 4)) && b.toString("ascii", 8, 12) === "WAVE"],
  ".flac": ["audio", "audio/flac", (b) => b.toString("ascii", 0, 4) === "fLaC"],
  ".ogg": ["audio", "audio/ogg", (b) => b.toString("ascii", 0, 4) === "OggS"],
  ".opus": ["audio", "audio/ogg", (b) => b.toString("ascii", 0, 4) === "OggS"],
  ".m4a": ["audio", "audio/mp4", (b) => b.toString("ascii", 4, 8) === "ftyp"],
};

export function mediaType(fileName, kind) {
  const extension = extname(fileName).toLowerCase();
  const type = types[extension];
  if (!type || type[0] !== kind) throw new InputError(kind === "cover"
    ? "Upload JPG, PNG, or WebP artwork."
    : "Upload MP3, WAV, FLAC, Ogg, Opus, or M4A audio.", 415);
  return { mime: type[1], matches: type[2], extension };
}

export function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || "");
  if (!match || (!match[1] && !match[2]) || size <= 0) return null;
  const [, first, last] = match;
  const start = first ? Number(first) : Math.max(0, size - Number(last));
  const end = first && last ? Math.min(Number(last), size - 1) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size ? { start, end } : null;
}

export function attachmentHeader(fileName) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");
  const encoded = encodeURIComponent(fileName.toWellFormed()).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
