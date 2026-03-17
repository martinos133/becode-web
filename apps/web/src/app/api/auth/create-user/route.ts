import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyJwt } from '@/lib/jwt';
import { dbQuery } from '@/lib/db';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Chýba token' }, { status: 401 });
  }

  try {
    verifyJwt(token);
  } catch {
    return NextResponse.json({ success: false, error: 'Neplatný token' }, { status: 401 });
  }

  const body = await request.json();
  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'E-mail a heslo sú povinné.' });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: 'Heslo musí mať aspoň 6 znakov.' });
  }

  const passwordHash = hashPassword(password);
  try {
    await dbQuery('insert into public.app_users (email, password_hash, role) values ($1, $2, $3)', [
      email,
      passwordHash,
      'authenticated',
    ]);
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return NextResponse.json({ success: false, error: 'Používateľ s týmto e-mailom už existuje.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: 'Nepodarilo sa vytvoriť používateľa.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: `Používateľ ${email} bol vytvorený.` });
}
