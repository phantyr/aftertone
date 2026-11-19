import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashPassword, verifyPassword, tokenDigest } from "../lib/passwords.mjs";
import { InputError, emailInput, releaseInput, slugify } from "../lib/input.mjs";
import { attachmentHeader, mediaType, parseRange } from "../lib/media-core.mjs";
import { readJson } from "../lib/request.mjs";
import { catalogHref, readCatalogFilters, releaseWindow } from "../lib/catalog-filters.mjs";

const idA = "01234567-89ab-4cde-8123-456789abcdef";
const idB = "12345678-9abc-4def-8123-456789abcdef";

const draft = {
  title: "Écho Line", date: "2024-02-29", kind: "EP", status: "draft",
  artist: "Red House", genre: "Techno", tracks: [],
};

test("release validation accepts a draft and produces a stable URL slug", () => {
  const parsed = releaseInput(draft);
  assert.equal(parsed.slug, "echo-line");
  assert.equal(parsed.coverId, null);
  assert.equal(parsed.featured, false);
  assert.equal(slugify("  Static // Method  "), "static-method");
  assert.throws(() => releaseInput({ ...draft, date: "2026-02-29" }), /valid release date/);
  assert.throws(() => releaseInput({ ...draft, slug: "../escape" }), /lowercase letters/);
});

test("subgenres are optional, trimmed, and limited to 60 characters", () => {
  assert.equal(releaseInput(draft).subgenre, "");
  assert.equal(releaseInput({ ...draft, subgenre: "  Dub Techno  " }).subgenre, "Dub Techno");
  assert.throws(() => releaseInput({ ...draft, subgenre: "x".repeat(61) }), /up to 60 characters/);
});

test("catalog URLs preserve filter selections and reject unsupported search parameter shapes", () => {
  const filters = readCatalogFilters({ genre: "Drum & Bass", subgenre: "Liquid Drum & Bass", kind: "EP", sort: "popular", page: "2" });
  assert.equal(catalogHref("/", filters), "/?genre=Drum+%26+Bass&subgenre=Liquid+Drum+%26+Bass&kind=EP&sort=popular&page=2#catalog");
  assert.deepEqual(readCatalogFilters({ sort: ["latest"], released: "toString", kind: "Mix", page: "-5" }),
    { q: "", genre: "", subgenre: "", label: "", kind: "", released: "", sort: "latest", page: 1 });
  assert.deepEqual(releaseWindow("week", new Date("2026-11-20T00:00:00Z")), ["2026-11-14", "2026-11-20"]);
});

test("label filters survive sorting and pagination with punctuation intact", () => {
  const filters = readCatalogFilters({ label: "  A&B / Éditions  ", genre: "House", sort: "popular", page: "2" });
  const url = new URL(catalogHref("/", filters), "http://localhost");
  assert.equal(url.searchParams.get("label"), "A&B / Éditions");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("genre"), "House");
  assert.equal(url.searchParams.get("sort"), "popular");
  assert.equal(url.hash, "#catalog");
  assert.equal(readCatalogFilters({ label: ["first", "second"] }).label, "");
});

test("published releases require artwork and playable tracks", () => {
  const publish = { ...draft, status: "published", featured: true };
  assert.throws(() => releaseInput(publish), /art and at least one track/);
  const track = { id: idA, title: "First", audioId: idB, durationSeconds: 80 };
  const release = releaseInput({ ...publish, coverId: idA, tracks: [track] });
  assert.equal(release.tracks[0].duration, 80);
  assert.equal(release.featured, true);
  assert.throws(() => releaseInput({ ...publish, coverId: idA, tracks: [track, track] }), /appear only once/);
  assert.throws(() => releaseInput({ ...publish, coverId: idA, tracks: [{ ...track, audioId: "fake" }] }), /valid audio file/);
});

test("session token digests and salted password hashes are deterministic only where needed", async () => {
  const secret = "an original lengthy password string";
  const [first, second] = await Promise.all([hashPassword(secret), hashPassword(secret)]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(secret, first), true);
  assert.equal(await verifyPassword(secret + "!", first), false);
  assert.equal(await verifyPassword(secret, null), false);
  assert.equal(tokenDigest("session-token").length, 64);
  assert.equal(emailInput(" Staff@Example.COM "), "staff@example.com");
});

test("media signatures reject unrelated content and accept bundled audio", async () => {
  const wave = await readFile(new URL("../public/audio/night-signal.wav", import.meta.url));
  const thumbnail = await readFile(new URL("../public/art/night-signal.webp", import.meta.url));
  assert.equal(mediaType("song.WAV", "audio").matches(wave.subarray(0, 16)), true);
  assert.equal(mediaType("song.WAV", "audio").matches(thumbnail.subarray(0, 16)), false);
  assert.equal(mediaType("cover.webp", "cover").matches(thumbnail.subarray(0, 16)), true);
  assert.throws(() => mediaType("unsafe.svg", "cover"), (error) => error.status === 415);
  assert.match(attachmentHeader("écho.wav"), /filename\*=UTF-8''%C3%A9cho\.wav/);
});

test("byte ranges support streaming and reject invalid requests", () => {
  assert.deepEqual(parseRange("bytes=0-9", 100), { start: 0, end: 9 });
  assert.deepEqual(parseRange("bytes=95-", 100), { start: 95, end: 99 });
  assert.deepEqual(parseRange("bytes=-25", 100), { start: 75, end: 99 });
  assert.deepEqual(parseRange("bytes=0-200", 100), { start: 0, end: 99 });
  for (const invalid of ["bytes=10-1", "bytes=100-", "bytes=-0", "bytes=1-2,4-6", "bytes=-"]) {
    assert.equal(parseRange(invalid, 100), null);
  }
});

test("JSON request reader rejects invalid or oversized streamed input", async () => {
  assert.deepEqual(await readJson(new Request("http://localhost/", { method: "POST", body: '{"status":"draft"}' })), { status: "draft" });
  await assert.rejects(readJson(new Request("http://localhost/", { method: "POST", body: "broken JSON" })), InputError);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(129 * 1024)); controller.close(); } });
  await assert.rejects(readJson(new Request("http://localhost/", { method: "POST", body: stream, duplex: "half" })), (error) => error.status === 413);
});
