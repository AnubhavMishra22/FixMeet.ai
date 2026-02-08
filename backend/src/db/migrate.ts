import { sql } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve migrations directory, always pointing to src/db/migrations.
 * Works from both src/ (dev) and dist/ (prod) since the relative position
 * is consistent: backend/{src|dist}/db/migrate.ts.
 */
function getMigrationsDir(): string {
  const backendRoot = path.resolve(__dirname, '..', '..');
  return path.join(backendRoot, 'src', 'db', 'migrations');
}

async function migrate() {
  const migrationsDir = getMigrationsDir();
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await sql.unsafe(content);
    console.log(`Completed: ${file}`);
  }

  await sql.end();
  console.log('All migrations complete');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
