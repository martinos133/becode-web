import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';
import { dbQuery } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Chýba token' }, { status: 401 });

  let payload: { sub: string };
  try {
    payload = verifyJwt(token) as any;
  } catch {
    return NextResponse.json({ error: 'Neplatný token' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const newPassword = String(body?.newPassword ?? '');
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Heslo musí mať aspoň 6 znakov.' }, { status: 400 });
  }

  const passwordHash = hashPassword(newPassword);
  await dbQuery('update public.app_users set password_hash = $1 where id = $2', [passwordHash, Number(payload.sub)]);
  return NextResponse.json({ success: true });
}

