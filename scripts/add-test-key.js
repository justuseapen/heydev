import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../server/src/db/schema.ts';

// Ensure directory exists
import { mkdirSync, existsSync } from 'fs';
const dataDir = './server/data';
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database('./server/data/heydev.db');
const db = drizzle(sqlite, { schema });

// Insert test API key
db.insert(schema.apiKeys)
  .values({ key: 'test-api-key-12345' })
  .onConflictDoNothing()
  .run();

console.log('Test API key created:', 'test-api-key-12345');

// Query all API keys to confirm
const keys = db.select().from(schema.apiKeys).all();
console.log('All API keys:', keys);

sqlite.close();
