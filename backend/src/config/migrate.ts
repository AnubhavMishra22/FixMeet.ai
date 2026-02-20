import { sql } from './database.js';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the migrations directory relative to this file's location.
 *
 * Works from both `src/config/` (dev) and `dist/config/` (prod) because the
 * build step copies .sql files to `dist/db/migrations/`.
 */
function getMigrationsDir(): string {
  // From `{src|dist}/config`, go up one level to `{src|dist}`, then into `db/migrations`
  return path.resolve(__dirname, '..', 'db', 'migrations');
}

/**
 * Run all SQL migrations on startup.
 * All migrations use CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS,
 * so they are idempotent and safe to re-run on every deploy.
 */
const BASE_BACKOFF_MS = 2000;

export async function runMigrations(retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sql`SELECT 1`;
      break;
    } catch (err) {
      console.error(`DB connection attempt ${attempt}/${retries} failed:`, err);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * BASE_BACKOFF_MS));
    }
  }

  const migrationsDir = getMigrationsDir();
  const allFiles = await readdir(migrationsDir);
  const files = allFiles.filter(f => f.endsWith('.sql')).sort();

  console.log(`Running ${files.length} database migrations...`);

  for (const file of files) {
    try {
      const content = await readFile(path.join(migrationsDir, file), 'utf-8');
      await sql.unsafe(content);
      console.log(`  Migration ${file}: OK`);
    } catch (error) {
      // Use PostgreSQL error codes instead of brittle string matching
      // 42P07: duplicate_table, 42710: duplicate_object (e.g. index)
      const pgError = error as { code?: string; message?: string };
      const alreadyExistsCodes = ['42P07', '42710'];

      if (pgError.code && alreadyExistsCodes.includes(pgError.code)) {
        console.log(`  Migration ${file}: skipped (already exists)`);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration ${file} failed: ${message}`);
      }
    }
  }

  console.log('Database migrations complete');
}
