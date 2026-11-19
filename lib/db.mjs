import { createRequire } from "node:module";
import { join } from "node:path";

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

export function getDatabase() {
  if (!databaseConfigured()) throw new Error("DATABASE_URL is required.");
  if (!globalThis.aftertoneDatabase) {
    const loadDriver = createRequire(join(process.cwd(), "package.json"));
    const postgres = loadDriver("postgres");
    globalThis.aftertoneDatabase = postgres(process.env.DATABASE_URL, {
      max: 10,
      connect_timeout: 7,
      idle_timeout: 20,
    });
  }
  return globalThis.aftertoneDatabase;
}

export function query(text, parameters = [], connection = getDatabase()) {
  return connection.unsafe(text, parameters);
}
