import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, randomUUID } from "node:crypto";
import { cache } from "react";
import { databaseConfigured, getDatabase, query } from "./db.mjs";
import { emailInput, idInput, InputError, passwordInput, textInput } from "./input.mjs";
import { hashPassword, tokenDigest, verifyPassword } from "./passwords.mjs";
import { siteOrigin } from "./request.mjs";

const SESSION = "aftertone_staff";
const AGE = 60 * 60 * 24 * 7;

export const getStaff = cache(async function getStaff() {
  if (!databaseConfigured()) return null;
  const token = (await cookies()).get(SESSION)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [staff] = await query(`SELECT u.id, u.email, u.name, u.role
    FROM staff_sessions s JOIN staff u ON u.id = s.staff_id
    WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`, [tokenDigest(token)]);
  return staff || null;
});

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/studio/sign-in");
  return staff;
}

export async function staffForWrite(adminOnly = false) {
  const staff = await getStaff();
  if (!staff) throw new InputError("Sign in to Studio first.", 401);
  if (adminOnly && staff.role !== "admin") throw new InputError("This action requires an administrator.", 403);
  return staff;
}

export async function signIn(input, request) {
  if (!input || typeof input !== "object") throw new InputError("Enter an email and password.");
  const email = emailInput(input.email);
  const password = input.password;
  if (typeof password !== "string" || !password || password.length > 128) throw new InputError("Email or password is incorrect.", 401);

  const [limit] = await query(`INSERT INTO login_limits(email, attempts, closes_at)
    VALUES ($1, 1, now() + interval '15 minutes')
    ON CONFLICT (email) DO UPDATE SET
      attempts = CASE WHEN login_limits.closes_at <= now() THEN 1 ELSE LEAST(login_limits.attempts + 1, 9) END,
      closes_at = CASE WHEN login_limits.closes_at <= now() THEN EXCLUDED.closes_at ELSE login_limits.closes_at END
    RETURNING attempts`, [email]);
  if (limit.attempts > 8) throw new InputError("Too many sign-in attempts. Try again in 15 minutes.", 429);

  const [staff] = await query("SELECT id, password_hash FROM staff WHERE email = $1 AND active", [email]);
  if (!await verifyPassword(password, staff?.password_hash)) throw new InputError("Email or password is incorrect.", 401);

  const token = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  const previous = cookieStore.get(SESSION)?.value;
  await getDatabase().begin(async (tx) => {
    // Serialize sign-in and password changes so a reset cannot leave an old credential's session active.
    const [current] = await query("SELECT password_hash, active FROM staff WHERE id = $1 FOR UPDATE", [staff.id], tx);
    if (!current?.active || current.password_hash !== staff.password_hash) throw new InputError("Email or password is incorrect.", 401);
    if (previous) await query("DELETE FROM staff_sessions WHERE token_hash = $1", [tokenDigest(previous)], tx);
    await query("DELETE FROM staff_sessions WHERE expires_at <= now()", [], tx);
    await query("DELETE FROM login_limits WHERE email = $1 OR closes_at < now() - interval '1 day'", [email], tx);
    await query("INSERT INTO staff_sessions (token_hash, staff_id, expires_at) VALUES ($1, $2, now() + interval '7 days')", [tokenDigest(token), staff.id], tx);
  });

  cookieStore.set(SESSION, token, {
    httpOnly: true, secure: siteOrigin(request)?.startsWith("https:"), sameSite: "lax", path: "/", maxAge: AGE,
  });
}

export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION)?.value;
  if (token) await query("DELETE FROM staff_sessions WHERE token_hash = $1", [tokenDigest(token)]);
  cookieStore.delete(SESSION);
}

export async function changePassword(input) {
  const actor = await staffForWrite();
  const previous = input?.currentPassword;
  const next = passwordInput(input?.newPassword);
  if (typeof previous !== "string" || !previous || previous.length > 128) throw new InputError("Enter your current password.");
  if (previous === next) throw new InputError("Choose a different password.");
  const [snapshot] = await query("SELECT password_hash FROM staff WHERE id=$1 AND active", [actor.id]);
  if (!snapshot || !await verifyPassword(previous, snapshot.password_hash)) throw new InputError("Current password is incorrect.", 403);
  const hash = await hashPassword(next);
  const token = (await cookies()).get(SESSION).value;
  const digest = tokenDigest(token);
  await getDatabase().begin(async (tx) => {
    const [current] = await query("SELECT password_hash,active FROM staff WHERE id=$1 FOR UPDATE", [actor.id], tx);
    const [session] = await query("SELECT 1 FROM staff_sessions WHERE staff_id=$1 AND token_hash=$2 AND expires_at>now()", [actor.id, digest], tx);
    if (!session || !current?.active || current.password_hash !== snapshot.password_hash) throw new InputError("Sign in again to continue.", 409);
    await query("UPDATE staff SET password_hash=$2 WHERE id=$1", [actor.id, hash], tx);
    await query("DELETE FROM staff_sessions WHERE staff_id=$1 AND token_hash<>$2", [actor.id, digest], tx);
    await recordActivity(tx, actor, "Changed password", actor.id, actor.name);
  });
}

export async function recordActivity(tx, actor, action, target, title) {
  await query("INSERT INTO studio_activity (actor_id, action, target_id, target_name) VALUES ($1,$2,$3,$4)", [actor.id, action, target, title], tx);
}

export async function listTeam() {
  return query("SELECT id, name, email, role, active, created_at FROM staff ORDER BY active DESC, name, id");
}

export async function saveTeamMember(actor, input) {
  if (!input || typeof input !== "object") throw new InputError("Account details are required.");
  const name = textInput(input.name, "Name", 100, true);
  const email = emailInput(input.email);
  const role = input.role;
  const active = input.active === true;
  if (!["admin", "editor"].includes(role)) throw new InputError("Select a staff role.");
  const id = idInput(input.id, "staff ID") || randomUUID();
  const passwordHash = !input.id || input.password ? await hashPassword(passwordInput(input.password)) : null;
  await getDatabase().begin(async (tx) => {
    await query("SELECT pg_advisory_xact_lock(2917048)", [], tx);
    const [currentActor] = await query("SELECT role, active FROM staff WHERE id = $1 FOR UPDATE", [actor.id], tx);
    if (!currentActor?.active || currentActor.role !== "admin") throw new InputError("This action requires an administrator.", 403);
    if (input.id) {
      const [old] = await query("SELECT id, role, active FROM staff WHERE id = $1 FOR UPDATE", [id], tx);
      if (!old) throw new InputError("Staff account not found.", 404);
      if (id === actor.id && (!active || role !== "admin")) throw new InputError("You must keep your administrator account active.");
      await query("UPDATE staff SET name=$2, email=$3, role=$4, active=$5, password_hash=COALESCE($6, password_hash) WHERE id=$1",
        [id, name, email, role, active, passwordHash], tx);
      if (passwordHash || old.active !== active || old.role !== role) {
        await query("DELETE FROM staff_sessions WHERE staff_id=$1", [id], tx);
      }
    } else {
      await query("INSERT INTO staff (id, email, name, password_hash, role, active) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, email, name, passwordHash, role, active], tx);
    }
    await recordActivity(tx, actor, input.id ? "Updated account" : "Created account", id, name);
  });
  return id;
}
