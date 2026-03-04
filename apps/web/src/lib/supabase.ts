import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;
  client = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
