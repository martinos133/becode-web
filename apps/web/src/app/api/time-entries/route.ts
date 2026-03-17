import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

type TimeEntryRow = {
  id: number;
  employee_id: number;
  project_id: number | null;
  worked_hours: number;
  work_date: string;
};

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { searchParams } = new URL(req.url);
    const employeeId = Number(searchParams.get('employeeId'));
    const from = String(searchParams.get('from') ?? '');
    const to = String(searchParams.get('to') ?? '');
    if (!employeeId || !from || !to) {
      return NextResponse.json({ error: 'Chýbajú parametre.' }, { status: 400 });
    }
    const { rows } = await dbQuery<TimeEntryRow>(
      `select id, employee_id, project_id, worked_hours, work_date
       from public.employee_time_entries
       where employee_id=$1 and work_date >= $2 and work_date <= $3
       order by work_date asc`,
      [employeeId, from, to]
    );
    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const employee_id = Number(body?.employee_id);
    const project_id = body?.project_id === null || body?.project_id === undefined ? null : Number(body?.project_id);
    const worked_hours = Number(body?.worked_hours);
    const work_date = String(body?.work_date ?? '').trim();

    if (!employee_id || !work_date || !Number.isFinite(worked_hours)) {
      return NextResponse.json({ error: 'Neplatné dáta.' }, { status: 400 });
    }

    const { rows } = await dbQuery<TimeEntryRow>(
      `insert into public.employee_time_entries (employee_id, project_id, worked_hours, work_date)
       values ($1,$2,$3,$4)
       returning id, employee_id, project_id, worked_hours, work_date`,
      [employee_id, project_id, worked_hours, work_date]
    );
    return NextResponse.json({ row: rows[0] });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    const status = msg.includes('Chýba token') ? 401 : 500;
    return NextResponse.json({ error: msg || 'Chyba' }, { status });
  }
}

