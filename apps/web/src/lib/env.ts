/**
 * Konfigurácia z env premenných (NEXT_PUBLIC_*).
 * Všetky hodnoty musia byť v .env.local.
 */

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Chýbajúca env premenná: ${key}. Nastav ju v .env.local`);
  }
  return v;
}

export const env = {
  get supabaseUrl(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_URL');
  },

  get supabaseAnonKey(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },

  get apiUrl(): string {
    return getEnv('NEXT_PUBLIC_API_URL');
  },
};
