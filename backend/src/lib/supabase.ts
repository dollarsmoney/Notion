import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Service-role client: bypasses RLS. Only ever used server-side.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client, used solely to validate incoming user JWTs.
export const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
