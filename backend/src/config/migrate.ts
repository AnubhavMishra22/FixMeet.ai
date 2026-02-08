import { sql } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all SQL migrations on startup.
 * All migrations use CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS,
 * so they are idempotent and safe to re-run on every deploy.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  console.log(`Running ${files.length} database migrations...`);

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await sql.unsafe(content);
      console.log(`  Migration ${file}: OK`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Skip "already exists" errors for safety, fail on anything else
      if (message.includes('already exists')) {
        console.log(`  Migration ${file}: skipped (already exists)`);
      } else {
        throw new Error(`Migration ${file} failed: ${message}`);
      }
    }
  }

  console.log('Database migrations complete');
}
