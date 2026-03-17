import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';
import crypto from 'crypto';

const sql = `
-- app_users (jednoduchý login)
CREATE TABLE IF NOT EXISTS public.app_users (
  id             bigserial PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  password_hash  text NOT NULL,
  role           text NOT NULL DEFAULT 'authenticated',
  created_at     timestamptz DEFAULT now()
);

-- employees
CREATE TABLE IF NOT EXISTS public.employees (
  id           bigserial PRIMARY KEY,
  first_name   text NOT NULL,
  last_name    text NOT NULL,
  email        text,
  phone        text,
  hourly_rate  numeric(10,2) DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id                 bigserial PRIMARY KEY,
  project            text,
  project_date        date,
  amount_without_vat  numeric(12,2) DEFAULT 0,
  cost               numeric(12,2) DEFAULT 0,
  employee           text,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS be_code_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vlado_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mato_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS manual_cost numeric(12,2) DEFAULT 0;

-- project_employees (viacerí zamestnanci na jeden projekt, s hodinami)
CREATE TABLE IF NOT EXISTS public.project_employees (
  id           bigserial PRIMARY KEY,
  project_id   bigint NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id  bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  worked_hours numeric(8,2) DEFAULT 0,
  UNIQUE(project_id, employee_id)
);
ALTER TABLE public.project_employees ADD COLUMN IF NOT EXISTS worked_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.project_employees ADD COLUMN IF NOT EXISTS cost numeric(12,2) DEFAULT 0;

-- migrácia: skopíruj staré employee_id do project_employees (ak ešte neexistujú)
INSERT INTO public.project_employees (project_id, employee_id)
  SELECT id, employee_id FROM public.projects
  WHERE employee_id IS NOT NULL
  ON CONFLICT (project_id, employee_id) DO NOTHING;

-- employee_time_entries
CREATE TABLE IF NOT EXISTS public.employee_time_entries (
  id            bigserial PRIMARY KEY,
  employee_id   bigint NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id    bigint REFERENCES public.projects(id) ON DELETE SET NULL,
  worked_hours  numeric(6,2) NOT NULL,
  work_date     date NOT NULL,
  created_at    timestamptz DEFAULT now()
);
`;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function POST(req: NextRequest) {
  try {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      return NextResponse.json({ error: 'Chýba DATABASE_URL' }, { status: 400 });
    }

    const client = new pg.Client({ connectionString });
    await client.connect();
    await client.query(sql);

    // Default admin (pre lokálny štart) – ak už existuje, prepneme rolu na admin a obnovíme heslo.
    const adminEmail = 'muha@becode.sk';
    const adminPassword = 'Welcome2025+';
    const passwordHash = hashPassword(adminPassword);
    await client.query(
      `insert into public.app_users (email, password_hash, role)
       values ($1, $2, 'admin')
       on conflict (email) do update set
         password_hash = excluded.password_hash,
         role = 'admin'`,
      [adminEmail, passwordHash]
    );

    await client.end();

    return NextResponse.json({
      success: true,
      message:
        'Tabuľky boli vytvorené. Admin účet: muha@becode.sk / Welcome2025+',
    });
  } catch (err: any) {
    console.error('Setup DB error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Chyba pri vytváraní tabuľky' },
      { status: 500 }
    );
  }
}
