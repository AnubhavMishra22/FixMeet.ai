import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string(),
  DATABASE_SSL: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('FixMeet <notifications@fixmeet.ai>'),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:3001/api/calendars/google/callback'),
  // AI Copilot (optional — routes only mount if API key is set)
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL_NAME: z.string().optional(),
  GOOGLE_AI_MAX_TOKENS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
