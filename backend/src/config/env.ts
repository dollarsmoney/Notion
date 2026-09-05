import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_BASE_URL: z.string().url().default('https://api.paystack.co'),

  // Where Paystack sends the buyer back after checkout.
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  // Comma-separated list of allowed browser origins.
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  CURRENCY: z.string().default('NGN'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
