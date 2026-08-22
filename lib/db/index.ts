import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

/**
 * Single shared SQLite connection for the server process.
 *
 * DATABASE_PATH overrides the file location (Docker will point it at a volume).
 * Migrations in /drizzle are applied automatically on first use, so a fresh
 * checkout or a fresh container gets a working database with no extra step.
 */
export const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "travel-blog.db");
const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

type Db = ReturnType<typeof createDb>;

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

// Survive Next.js dev-server hot reloads without opening a new connection each time.
const globalForDb = globalThis as unknown as { __travelBlogDb?: Db };

export const db: Db = globalForDb.__travelBlogDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__travelBlogDb = db;
}

export { schema };
