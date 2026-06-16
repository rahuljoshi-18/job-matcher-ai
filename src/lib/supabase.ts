import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

/**
 * Returns a Supabase admin client using the service role key.
 * Lazy-initialised — only created when first called, so the app
 * does not crash on startup if the env vars are missing.
 */
export function getSupabaseAdmin() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
