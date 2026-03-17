import 'server-only';
import pg from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __becode_pg_pool__: any;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL nie je nastavený.');
  }
  return url;
}

export function dbPool() {
  if (!global.__becode_pg_pool__) {
    const PoolCtor = (pg as any).Pool;
    global.__becode_pg_pool__ = new PoolCtor({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__becode_pg_pool__;
}

export async function dbQuery<T = any>(text: string, params?: any[]) {
  return dbPool().query(text, params) as Promise<{ rows: T[] }>;
}

