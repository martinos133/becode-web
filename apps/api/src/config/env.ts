/**
 * Centrálna konfigurácia z env premenných.
 * Načítava sa cez ConfigModule v AppModule, takže process.env je vyplnený.
 */
export const env = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  },

  get port(): number {
    const v = process.env.PORT;
    return v ? parseInt(v, 10) : 3001;
  },

  get corsOrigin(): string {
    return process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  },

  /** Povolené originy pre CORS (localhost:3000, 3002 + CORS_ORIGIN ak je viac oddelených čiarkou). */
  get corsOrigins(): string[] {
    const fromEnv = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
    const defaults = ['http://localhost:3000', 'http://localhost:3002'];
    return [...new Set([...defaults, ...fromEnv])];
  },

  get databaseUrl(): string {
    const v = process.env.DATABASE_URL;
    if (!v) throw new Error('DATABASE_URL musí byť nastavený v .env');
    return v;
  },

  get authJwtSecret(): string {
    const v = process.env.AUTH_JWT_SECRET;
    if (!v) throw new Error('AUTH_JWT_SECRET musí byť nastavený v .env');
    return v;
  },
};
