import { sql } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await sql.unsafe(content);
      console.log(`Completed: ${file}`);
    }
  }

  await sql.end();
  console.log('All migrations complete');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
