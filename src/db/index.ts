import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";
import { config } from "../lib/config.js";
import { log } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = config.DATABASE_PATH;
log.info({ dbPath }, "Opening SQLite database");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL"); // Better concurrent read performance
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-run migrations on startup
export function runMigrations(): void {
  try {
    migrate(db, { migrationsFolder: path.join(__dirname, "..", "..", "drizzle") });
    log.info("Database migrations applied successfully");
  } catch (err) {
    log.error({ err }, "Database migration failed");
    throw err;
  }
}
