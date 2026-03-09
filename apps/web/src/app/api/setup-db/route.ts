import { NextRequest, NextResponse } from 'next/server';
import pg from 'pg';

const sql = `
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
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_select" ON public.employees;
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
CREATE POLICY "employees_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "employees_update" ON public.employees;
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employees_delete" ON public.employees;
CREATE POLICY "employees_delete" ON public.employees FOR DELETE TO authenticated USING (true);

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
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS employee_id bigint REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS be_code_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS vlado_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS mato_hours numeric(8,2) DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS total_hours numeric(8,2) DEFAULT 0;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated USING (true);

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
ALTER TABLE public.project_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_employees_select" ON public.project_employees;
CREATE POLICY "project_employees_select" ON public.project_employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "project_employees_insert" ON public.project_employees;
CREATE POLICY "project_employees_insert" ON public.project_employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "project_employees_update" ON public.project_employees;
CREATE POLICY "project_employees_update" ON public.project_employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "project_employees_delete" ON public.project_employees;
CREATE POLICY "project_employees_delete" ON public.project_employees FOR DELETE TO authenticated USING (true);

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
ALTER TABLE public.employee_time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employee_time_entries_select" ON public.employee_time_entries;
CREATE POLICY "employee_time_entries_select" ON public.employee_time_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "employee_time_entries_insert" ON public.employee_time_entries;
CREATE POLICY "employee_time_entries_insert" ON public.employee_time_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "employee_time_entries_update" ON public.employee_time_entries;
CREATE POLICY "employee_time_entries_update" ON public.employee_time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "employee_time_entries_delete" ON public.employee_time_entries;
CREATE POLICY "employee_time_entries_delete" ON public.employee_time_entries FOR DELETE TO authenticated USING (true);
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const password = body?.password?.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!password || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Chýba heslo alebo SUPABASE_URL' },
        { status: 400 }
      );
    }

    const url = new URL(supabaseUrl);
    const host = url.hostname.replace('.supabase.co', '');
    const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${host}.supabase.co:5432/postgres`;

    const client = new pg.Client({ connectionString });
    await client.connect();
    await client.query(sql);
    await client.end();

    return NextResponse.json({ success: true, message: 'Tabuľky employees, projects a employee_time_entries boli vytvorené.' });
  } catch (err: any) {
    console.error('Setup DB error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Chyba pri vytváraní tabuľky' },
      { status: 500 }
    );
  }
}
