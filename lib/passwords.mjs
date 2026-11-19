import { promisify } from "node:util";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const derive = promisify(scrypt);
const settings = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummyHash = `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const digest = await derive(password, salt, 64, settings);
  return `scrypt:${salt}:${digest.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(storedHash || dummyHash);
  if (!match) return false;
  const [, salt, expected] = match;
  const digest = await derive(password, salt, 64, settings);
  return timingSafeEqual(digest, Buffer.from(expected, "hex")) && Boolean(storedHash);
}

export const tokenDigest = (token) => createHash("sha256").update(token).digest("hex");
