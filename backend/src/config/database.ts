import postgres from 'postgres';
import { env, isProd } from './env.js';

export const sql = postgres(env.DATABASE_URL, {
  ssl: isProd ? 'require' : false,
  max: isProd ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
});
