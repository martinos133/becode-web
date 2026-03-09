#!/usr/bin/env node
/**
 * Skript vytvorí tabuľku employees v Supabase.
 *
 * 1. Otvor Supabase Dashboard → Project Settings → Database
 * 2. Skopíruj "Connection string" (URI) – priame pripojenie
 * 3. Pridaj do apps/.env:
 *    DATABASE_URL=postgresql://postgres:[HESLO]@db.xxx.supabase.co:5432/postgres
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const paths = [
    resolve(__dirname, '../apps/.env'),
    resolve(__dirname, '../apps/.env.local'),
    resolve(__dirname, '../.env'),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) {
          const key = m[1].trim();
          const val = m[2].trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL && process.env.SUPABASE_URL && process.env.SUPABASE_DB_PASSWORD) {
  const url = new URL(process.env.SUPABASE_URL);
  const host = url.hostname.replace('.supabase.co', '');
  DATABASE_URL = `postgresql://postgres:${encodeURIComponent(process.env.SUPABASE_DB_PASSWORD)}@db.${host}.supabase.co:5432/postgres`;
}

if (!DATABASE_URL) {
  console.error(`
Chýba DATABASE_URL alebo SUPABASE_DB_PASSWORD v apps/.env

Možnosť A – DATABASE_URL:
1. Supabase Dashboard → Project Settings → Database → Connection string (URI)
2. Pridaj do apps/.env:
   DATABASE_URL=postgresql://postgres:[Heslo]@db.xxx.supabase.co:5432/postgres

Možnosť B – SUPABASE_DB_PASSWORD:
   Pridaj do apps/.env (heslo z Project Settings → Database):
   SUPABASE_DB_PASSWORD=tvoje_heslo

Alternatíva: Spusti SQL manuálne v Supabase SQL Editor:
   SQL Editor → New query → vlož obsah scripts/create-employees-table.sql → Run
`);
  process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS public.employees (
  id           bigserial PRIMARY KEY,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  email        text,
  phone        text,
  hourly_rate  numeric(10,2) DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (true);
`;

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query(sql);
    console.log('✓ Tabuľka public.employees bola vytvorená.');
  } catch (err) {
    console.error('Chyba:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
