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
  EMAIL_FROM: z.string().default('FixMeet <notifications@fixmeet.app>'),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:3001/api/calendars/google/callback'),
  // AI Copilot (optional — routes only mount if API key is set)
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL_NAME: z.string().optional(),
  GOOGLE_AI_MAX_TOKENS: z.string().optional(),
  // MCP (optional — HTTP transport only mounts if enabled)
  MCP_ENABLED: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  MCP_RATE_LIMIT: z.string().default('30').transform(Number),
  // Stripe (optional). Checkout and Customer Portal need STRIPE_SECRET_KEY. Webhooks need that plus STRIPE_WEBHOOK_SECRET.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_MAX: z.string().optional(),
  // If true, paid-feature API checks are skipped so demos work without a subscription. Webhooks still update the database.
  BILLING_SHOWCASE_MODE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  // If true, routes that call assertPlanAtLeast enforce Pro/Max tiers. Default off until product gating is ready.
  BILLING_ENFORCE_PAID_FEATURES: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/** Default AI model — used by both AI copilot and brief generator */
export const DEFAULT_AI_MODEL = 'gemini-2.5-flash-lite';
