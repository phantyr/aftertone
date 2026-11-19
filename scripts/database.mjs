import { readFile, readdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { getDatabase, query } from "../lib/db.mjs";
import { hashPassword } from "../lib/passwords.mjs";
import { emailInput, passwordInput, textInput } from "../lib/input.mjs";
import { mediaType } from "../lib/media-core.mjs";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), true);
const root = fileURLToPath(new URL("../", import.meta.url));

async function migrate(sql) {
  await sql.begin(async (tx) => {
    await query("SELECT pg_advisory_xact_lock(2917047)", [], tx);
    await query("CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())", [], tx);
    const applied = new Set((await query("SELECT filename FROM schema_migrations", [], tx)).map((row) => row.filename));
    const files = (await readdir(resolve(root, "db"))).filter((name) => /^\d+-.+\.sql$/.test(name)).sort();
    for (const filename of files) {
      if (applied.has(filename)) continue;
      await tx.unsafe(await readFile(resolve(root, "db", filename), "utf8")).simple();
      await query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename], tx);
      console.log(`Applied ${filename}`);
    }
  });
}

async function seed(sql) {
  const demos = JSON.parse(readFileSync(resolve(root, "content", "releases.json"), "utf8"));
  await sql.begin(async (tx) => {
    await query("SELECT pg_advisory_xact_lock(2917049)", [], tx);
    let hasFeature = (await query("SELECT 1 FROM releases WHERE featured LIMIT 1", [], tx)).length > 0;
    async function asset(url, kind) {
      const key = url.slice(1);
      const metadata = await stat(kind === "audio"
        ? resolve(root, "content", "demo-audio", key.split("/").at(-1))
        : resolve(root, "public", key));
      const name = key.split("/").at(-1);
      const { mime } = mediaType(name, kind);
      const [result] = await query(`INSERT INTO media_assets (id,kind,storage,storage_key,name,mime,size_bytes)
        VALUES ($1,$2,'demo',$3,$4,$5,$6) ON CONFLICT (storage_key) DO UPDATE SET name=excluded.name RETURNING id`,
      [randomUUID(), kind, key, name, mime, metadata.size], tx);
      return result.id;
    }
    for (const item of demos) {
      const [existing] = await query("SELECT 1 FROM releases WHERE slug=$1", [item.slug], tx);
      if (existing) continue;
      const [cover, audio] = [await asset(item.cover, "cover"), await asset(item.download, "audio")];
      const releaseId = randomUUID();
      const featured = Boolean(item.featured && !hasFeature);
      if (featured) hasFeature = true;
      await query(`INSERT INTO releases (id,slug,title,artist,genre,kind,label,summary,description,release_date,cover_id,status,featured,demo,published_at,subgenre)
        VALUES ($1,$2,$3,$4,$5,'Single','Aftertone Archive',$6,$7,$8,$9,'published',$10,true,now(),$11) ON CONFLICT (slug) DO NOTHING`,
      [releaseId,item.slug,item.title,item.artist,item.genre,item.tagline,item.description,item.date,cover,featured,item.subgenre || ""], tx);
      const [inserted] = await query("SELECT 1 FROM releases WHERE id=$1", [releaseId], tx);
      if (inserted) await query("INSERT INTO tracks (id,release_id,position,title,audio_id,duration_seconds) VALUES ($1,$2,1,$3,$4,24)",
        [randomUUID(),releaseId,item.title,audio], tx);
    }
  });
  console.log("Demo releases are available in the catalog.");
}

async function admin(sql) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let name, email;
  try {
    name = textInput(process.env.ADMIN_NAME || await prompt.question("Admin display name: "), "Name", 100, true);
    email = emailInput(process.env.ADMIN_EMAIL || await prompt.question("Admin email: "));
  } finally {
    prompt.close();
  }
  const password = passwordInput(process.env.ADMIN_PASSWORD);
  const passwordHash = await hashPassword(password);
  await query(`INSERT INTO staff (id,email,name,password_hash,role) VALUES ($1,$2,$3,$4,'admin')`,
    [randomUUID(),email,name,passwordHash], sql);
  console.log(`Created administrator ${email}.`);
}

let sql;
try {
  const command = process.argv[2];
  if (!["migrate", "seed", "admin"].includes(command)) throw new Error("Use migrate, seed, or admin.");
  if (command === "admin" && !process.env.ADMIN_PASSWORD) throw new Error("Set ADMIN_PASSWORD in .env.local or your shell before creating an administrator.");
  sql = getDatabase();
  if (command === "migrate") await migrate(sql);
  if (command === "seed") await seed(sql);
  if (command === "admin") await admin(sql);
} catch (error) {
  console.error(error.code === "23505" ? "A staff account already uses that email." : error.message);
  process.exitCode = 1;
} finally {
  if (sql) await sql.end({ timeout: 3 });
}
