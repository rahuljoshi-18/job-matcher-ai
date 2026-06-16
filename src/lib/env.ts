import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // AI providers — optional at startup, validated at usage
  GROQ_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  // Supabase Storage — optional at startup, validated at usage
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// Validate on module load (only required vars; optional ones are checked lazily)
export const env = validateEnv();

/**
 * Asserts an optional env var is set at the point of use.
 * Throws a clear error rather than a cryptic "cannot read undefined" later.
 */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (!value) {
    throw new Error(
      `Environment variable "${key}" is required for this operation but is not set. ` +
        `Add it to your .env.local file. See .env.example for reference.`
    );
  }
  return value as NonNullable<Env[K]>;
}
