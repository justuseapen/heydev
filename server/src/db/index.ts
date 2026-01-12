import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

// Default database path - can be overridden via environment variable
const DB_PATH = process.env.DATABASE_PATH || "./data/heydev.db";

// Ensure the directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create the database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
sqlite.pragma("journal_mode = WAL");

// Create the Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Export the schema for use in queries
export * from "./schema.js";
