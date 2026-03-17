/**
 * Konfigurácia z env premenných (NEXT_PUBLIC_*).
 * Používa hodnoty z .env.local alebo fallback z next.config / apps/.env.
 */

function getEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const env = {
  get apiUrl(): string {
    return getEnv('NEXT_PUBLIC_API_URL', '');
  },

  /** URL pre auth endpoint – ak apiUrl nie je nastavené, používa /api (Vercel) */
  authUrl(path: string): string {
    const base = this.apiUrl.trim();
    return base ? `${base.replace(/\/$/, '')}${path}` : `/api${path}`;
  },

  /** Kľúč v sessionStorage pre JWT */
  get authTokenStorageKey(): string {
    return getEnv('NEXT_PUBLIC_AUTH_TOKEN_STORAGE_KEY', 'auth_token');
  },
};
