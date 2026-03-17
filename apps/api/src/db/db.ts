import { Pool } from 'pg';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __becode_api_pg_pool__: Pool | undefined;
}

function pool(): Pool {
  if (!global.__becode_api_pg_pool__) {
    global.__becode_api_pg_pool__ = new Pool({
      connectionString: env.databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }
  return global.__becode_api_pg_pool__;
}

export async function dbQuery<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
  const res = await pool().query(text, params as any[]);
  return { rows: res.rows as T[] };
}

