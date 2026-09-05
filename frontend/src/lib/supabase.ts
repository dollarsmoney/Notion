import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  client ??= getConfig().then((cfg) => {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('Supabase is not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY.');
    }
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  });
  return client;
}
