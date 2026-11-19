import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { recordActivity } from "./auth";
import { databaseConfigured, getDatabase, query } from "./db.mjs";
import { InputError, idInput, textInput } from "./input.mjs";
import { tokenDigest } from "./passwords.mjs";
import { siteOrigin } from "./request.mjs";
import { PASS_DAYS } from "./download-policy.mjs";

const COOKIE = "edmsync_listener";
const SESSION_SECONDS = 30 * 86400;
const validToken = (value) => typeof value === "string" && /^[\w-]{43}$/.test(value);

export const getPremium = cache(async () => {
  if (!databaseConfigured()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!validToken(token)) return null;
  const [member] = await query(`SELECT p.holder,p.expires_at FROM premium_sessions s
    JOIN premium_passes p ON p.id=s.pass_id WHERE s.token_hash=$1 AND s.expires_at>now()
    AND p.revoked_at IS NULL AND p.expires_at>now()`, [tokenDigest(token)]);
  return member || null;
});

export async function activatePass(input, request) {
  const code = typeof input?.code === "string" ? input.code.trim() : "";
  const denied = () => new InputError("This Premium pass is invalid, expired, or revoked.", 401);
  if (!code.startsWith("EDM-") || !validToken(code.slice(4))) throw denied();
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  const token = randomBytes(32).toString("base64url");
  await getDatabase().begin(async (tx) => {
    const [pass] = await query(`SELECT id FROM premium_passes WHERE code_hash=$1
      AND revoked_at IS NULL AND expires_at>now() FOR SHARE`, [tokenDigest(code)], tx);
    if (!pass) throw denied();
    if (validToken(old)) await query("DELETE FROM premium_sessions WHERE token_hash=$1", [tokenDigest(old)], tx);
    await query("DELETE FROM premium_sessions WHERE expires_at<=now()", [], tx);
    await query(`INSERT INTO premium_sessions(token_hash,pass_id,expires_at)
      VALUES ($1,$2,now()+interval '30 days')`, [tokenDigest(token), pass.id], tx);
  });
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: siteOrigin(request)?.startsWith("https:"), path: "/", maxAge: SESSION_SECONDS });
}

export async function leavePremium() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (validToken(token)) await query("DELETE FROM premium_sessions WHERE token_hash=$1", [tokenDigest(token)]);
  jar.delete(COOKIE);
}

export function listPasses() {
  return query(`SELECT id,holder,expires_at, CASE WHEN revoked_at IS NOT NULL THEN 'Revoked'
    WHEN expires_at<=now() THEN 'Expired' ELSE 'Active' END AS status FROM premium_passes ORDER BY created_at DESC`);
}

export async function managePass(actor, input) {
  return getDatabase().begin(async (tx) => {
    const [admin] = await query("SELECT id FROM staff WHERE id=$1 AND role='admin' AND active FOR SHARE", [actor.id], tx);
    if (!admin) throw new InputError("Administrator access is required.", 403);
    if (input?.action === "revoke") {
      const id = idInput(input.id, "pass ID", true);
      const [pass] = await query("UPDATE premium_passes SET revoked_at=coalesce(revoked_at,now()) WHERE id=$1 RETURNING holder", [id], tx);
      if (!pass) throw new InputError("Pass not found.", 404);
      await query("DELETE FROM premium_sessions WHERE pass_id=$1", [id], tx);
      await recordActivity(tx, actor, "Revoked Premium pass", id, pass.holder);
      return { ok: true };
    }
    if (input?.action !== "issue" || !PASS_DAYS.includes(input.days)) throw new InputError("Select a valid pass duration.");
    const holder = textInput(input.holder, "Member name", 120, true);
    const code = "EDM-" + randomBytes(32).toString("base64url");
    const id = randomUUID();
    await query(`INSERT INTO premium_passes(id,holder,code_hash,expires_at)
      VALUES ($1,$2,$3,now()+($4::int * interval '1 day'))`, [id, holder, tokenDigest(code), input.days], tx);
    await recordActivity(tx, actor, "Issued Premium pass", id, holder);
    return { code };
  });
}
