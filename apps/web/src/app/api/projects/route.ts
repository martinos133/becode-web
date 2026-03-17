import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

type ProjectRow = {
  id: number;
  project: string | null;
  project_date: string | null;
  amount_without_vat: number;
  cost: number;
  manual_cost: number;
  total_hours: number;
};

type ProjectEmployeeRow = {
  project_id: number;
  employee_id: number;
  worked_hours: number;
};

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { rows: projects } = await dbQuery<ProjectRow>(
      'select id, project, project_date, amount_without_vat, cost, manual_cost, total_hours from public.projects order by id asc'
    );
    const ids = projects.map((p: ProjectRow) => p.id);
    let projectEmployees: ProjectEmployeeRow[] = [];
    if (ids.length) {
      const { rows } = await dbQuery<ProjectEmployeeRow>(
        'select project_id, employee_id, worked_hours from public.project_employees where project_id = any($1::bigint[])',
        [ids]
      );
      projectEmployees = rows;
    }
    return NextResponse.json({ projects, projectEmployees });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ error: 'Chýba id.' }, { status: 400 });

    const project = String(body?.project ?? '').trim() || null;
    const project_date = String(body?.project_date ?? '').trim() || null;
    const amount_without_vat = Number(body?.amount_without_vat ?? 0) || 0;
    const manual_cost = Number(body?.manual_cost ?? 0) || 0;
    const cost = Number(body?.cost ?? 0) || 0;
    const total_hours = Number(body?.total_hours ?? 0) || 0;
    const projectEmployees = Array.isArray(body?.projectEmployees) ? body.projectEmployees : [];

    await dbQuery(
      `insert into public.projects (id, project, project_date, amount_without_vat, cost, manual_cost, total_hours)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) do update set
         project=excluded.project,
         project_date=excluded.project_date,
         amount_without_vat=excluded.amount_without_vat,
         cost=excluded.cost,
         manual_cost=excluded.manual_cost,
         total_hours=excluded.total_hours`,
      [id, project, project_date, amount_without_vat, cost, manual_cost, total_hours]
    );

    await dbQuery('delete from public.project_employees where project_id=$1', [id]);
    for (const pe of projectEmployees) {
      const employee_id = Number(pe?.employeeId);
      const worked_hours = Number(pe?.hours ?? 0) || 0;
      if (!employee_id) continue;
      await dbQuery(
        'insert into public.project_employees (project_id, employee_id, worked_hours) values ($1,$2,$3)',
        [id, employee_id, worked_hours]
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    const status = msg.includes('Chýba token') ? 401 : 500;
    return NextResponse.json({ error: msg || 'Chyba' }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireAuth(req);
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'Chýba id.' }, { status: 400 });
    await dbQuery('delete from public.projects where id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    const status = msg.includes('Chýba token') ? 401 : 500;
    return NextResponse.json({ error: msg || 'Chyba' }, { status });
  }
}

