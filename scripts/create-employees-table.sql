-- Spusti tento SQL v Supabase Dashboard: SQL Editor → New query → vlož a Run

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
