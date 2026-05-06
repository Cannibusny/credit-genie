import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";
import { config } from "../lib/config.js";

const sqlite = new Database(config.DATABASE_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Run any pending migrations from the drizzle/ migrations folder. */
export function runMigrations(): void {
  // The migrations folder lives at the repo root; resolve relative to this file
  // so it works both from src (tsx) and dist (compiled).
  const migrationsFolder = path.resolve(__dirname, "..", "..", "drizzle");
  migrate(db, { migrationsFolder });
}
