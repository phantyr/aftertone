import { externalHttpsUrl } from "./download-policy.mjs";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const RELEASE_TYPES = ["Single", "EP", "Album", "VA"];
export const RELEASE_STATES = ["draft", "published", "archived"];

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function textInput(input, name, max, required = false) {
  if (input === undefined || input === null) input = "";
  if (typeof input !== "string") throw new InputError(`${name} must be text.`);
  const value = input.trim();
  if (required && !value) throw new InputError(`${name} is required.`);
  if (value.length > max) throw new InputError(`${name} can have up to ${max} characters.`);
  return value;
}

export function emailInput(value) {
  const email = textInput(value, "Email", 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError("Enter a valid email address.");
  return email;
}

export function passwordInput(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) {
    throw new InputError("Use a password between 12 and 128 characters.");
  }
  return value;
}

export function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "");
}

export function idInput(value, label, required = false) {
  if (!value && !required) return null;
  if (typeof value !== "string" || !UUID.test(value)) throw new InputError(`Select a valid ${label}.`);
  return value.toLowerCase();
}

function dateInput(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isFinite(parsed.valueOf()) && parsed.getUTCFullYear() > 0 && parsed.toISOString().slice(0, 10) === value) return value;
  }
  throw new InputError("Enter a valid release date.");
}

export function releaseInput(value) {
  if (!value || typeof value !== "object") throw new InputError("Release details are required.");
  const { kind, status } = value;
  if (!RELEASE_TYPES.includes(kind)) throw new InputError("Select a release type.");
  if (!RELEASE_STATES.includes(status)) throw new InputError("Select a release status.");
  const title = textInput(value.title, "Title", 140, true);
  const slug = textInput(value.slug, "Slug", 80) || slugify(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new InputError("Use only lowercase letters, numbers, and single hyphens in the slug.");
  if (!Array.isArray(value.tracks) || value.tracks.length > 50) throw new InputError("A release can contain up to 50 tracks.");
  const trackIds = new Set();
  const tracks = value.tracks.map((track, index) => {
    if (!track || typeof track !== "object") throw new InputError(`Track ${index + 1} is invalid.`);
    const id = idInput(track.id, "track ID");
    if (id && trackIds.has(id)) throw new InputError("A track can appear only once in a release.");
    if (id) trackIds.add(id);
    const duration = track.durationSeconds || null;
    if (duration && (!Number.isInteger(duration) || duration < 1 || duration > 86400)) {
      throw new InputError(`Track ${index + 1} length must be a whole number of seconds, up to 24 hours.`);
    }
    const freeUrl = textInput(track.freeDownloadUrl, "Free download link", 2048);
    if (freeUrl && !externalHttpsUrl(freeUrl)) throw new InputError("Use an HTTPS link to the external download host.");
    const audioId = idInput(track.audioId, `audio file for track ${index + 1}`, true);
    const previewId = idInput(track.previewId, "preview file");
    if (previewId === audioId) throw new InputError("Choose a separate preview clip.");
    return {
      id,
      title: textInput(track.title, `Track ${index + 1} title`, 160, true),
      artist: textInput(track.artist, "Track artist", 120),
      audioId, previewId,
      freeDownloadUrl: track.freeDownloadUrl === undefined ? undefined : externalHttpsUrl(freeUrl) || "",
      duration,
    };
  });

  const coverId = idInput(value.coverId, "cover");
  if (status === "published" && (!coverId || tracks.length === 0)) {
    throw new InputError("Add cover art and at least one track before publishing.");
  }
  return {
    slug, title, kind, status, coverId, tracks, featured: value.featured === true && status === "published",
    artist: textInput(value.artist, "Artist", 120, true),
    genre: textInput(value.genre, "Genre", 48, true),
    subgenre: textInput(value.subgenre, "Subgenre", 60),
    label: textInput(value.label, "Label", 90),
    summary: textInput(value.summary, "Short description", 220),
    description: textInput(value.description, "Release notes", 10000),
    date: dateInput(value.date),
  };
}
