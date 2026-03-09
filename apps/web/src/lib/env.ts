/**
 * Konfigurácia z env premenných (NEXT_PUBLIC_*).
 * Používa hodnoty z .env.local alebo fallback z next.config / apps/.env.
 */

function getEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const env = {
  get supabaseUrl(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://dzdmcfdynksghhwkwtft.supabase.co');
  },

  get supabaseAnonKey(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_5Zn7c7ctkTg7NGnhWX6K7g_Rz787-QW');
  },

  get apiUrl(): string {
    return getEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
  },
};
