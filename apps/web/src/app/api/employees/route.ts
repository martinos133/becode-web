import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';

type EmployeeRow = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hourly_rate: number;
};

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { rows } = await dbQuery<EmployeeRow>(
      'select id, first_name, last_name, email, phone, hourly_rate from public.employees order by id asc'
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
    const first_name = String(body?.first_name ?? '').trim();
    const last_name = String(body?.last_name ?? '').trim();
    const email = String(body?.email ?? '').trim() || null;
    const phone = String(body?.phone ?? '').trim() || null;
    const hourly_rate = Number(body?.hourly_rate ?? 0) || 0;

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'Meno a priezvisko sú povinné.' }, { status: 400 });
    }

    const { rows } = await dbQuery<EmployeeRow>(
      'insert into public.employees (first_name, last_name, email, phone, hourly_rate) values ($1,$2,$3,$4,$5) returning id, first_name, last_name, email, phone, hourly_rate',
      [first_name, last_name, email, phone, hourly_rate]
    );
    return NextResponse.json({ row: rows[0] });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    const status = msg.includes('Chýba token') ? 401 : 500;
    return NextResponse.json({ error: msg || 'Chyba' }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!id) return NextResponse.json({ error: 'Chýba id.' }, { status: 400 });

    const first_name = String(body?.first_name ?? '').trim();
    const last_name = String(body?.last_name ?? '').trim();
    const email = String(body?.email ?? '').trim() || null;
    const phone = String(body?.phone ?? '').trim() || null;
    const hourly_rate = Number(body?.hourly_rate ?? 0) || 0;

    const { rows } = await dbQuery<EmployeeRow>(
      'update public.employees set first_name=$1, last_name=$2, email=$3, phone=$4, hourly_rate=$5 where id=$6 returning id, first_name, last_name, email, phone, hourly_rate',
      [first_name, last_name, email, phone, hourly_rate, id]
    );
    return NextResponse.json({ row: rows[0] });
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
    await dbQuery('delete from public.employees where id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    const status = msg.includes('Chýba token') ? 401 : 500;
    return NextResponse.json({ error: msg || 'Chyba' }, { status });
  }
}

