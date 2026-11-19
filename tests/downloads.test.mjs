import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { externalHttpsUrl } from "../lib/download-policy.mjs";
import { releaseInput } from "../lib/input.mjs";

const audioId = "01234567-89ab-4cde-8123-456789abcdef";
const release = { title: "A release", artist: "An artist", date: "2026-10-01", genre: "House", kind: "Single", status: "draft" };
const track = { title: "A track", audioId };
const validateTrack = (values) => releaseInput({ ...release, tracks: [{ ...track, ...values }] }).tracks[0];

test("external links support provider parameters and reject non-HTTPS or credential-bearing destinations", () => {
  const good = "https://files.example/d/a%2Fb?key=abc%2Bdef";
  assert.equal(validateTrack({ freeDownloadUrl: good }).freeDownloadUrl, good);
  for (const value of ["//files.example/d", "/relative", "javascript:alert(1)", "http://files.example/", "https://user:password@files.example/a"]) {
    assert.equal(externalHttpsUrl(value), null);
    assert.throws(() => validateTrack({ freeDownloadUrl: value }), /HTTPS link/);
  }
});

test("old clients preserve existing host links and Studio can explicitly clear them", () => {
  assert.equal(validateTrack({}).freeDownloadUrl, undefined);
  assert.equal(validateTrack({ freeDownloadUrl: "" }).freeDownloadUrl, "");
  assert.throws(() => validateTrack({ previewId: audioId.toUpperCase() }), /separate preview/);
});

test("all public demo WAVs are eight-second excerpts with private full-length originals", async () => {
  const publicFolder = new URL("../public/audio/", import.meta.url);
  const privateFolder = new URL("../content/demo-audio/", import.meta.url);
  const samples = (await readdir(publicFolder)).filter((name) => name.endsWith(".wav"));
  assert.ok(samples.length);
  for (const name of samples) {
    const [sample, master] = await Promise.all([readFile(new URL(name, publicFolder)), readFile(new URL(name, privateFolder))]);
    assert.equal(sample.toString("ascii", 0, 4), "RIFF");
    assert.equal(sample.readUInt32LE(40), 8 * sample.readUInt32LE(28));
    assert.ok(master.length > sample.length);
  }
});
