import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import crypto from 'crypto';
import { signJwt } from '@/lib/jwt';

function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
  return `${saltHex}:${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const computed = hashPassword(password, saltHex);
  const [, computedHashHex] = computed.split(':');
  const a = Buffer.from(hashHex, 'hex');
  const b = Buffer.from(computedHashHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail a heslo sú povinné.' }, { status: 400 });
  }

  let rows: { id: number; email: string; password_hash: string; role: string }[] = [];
  try {
    ({ rows } = await dbQuery<{ id: number; email: string; password_hash: string; role: string }>(
      'select id, email, password_hash, role from public.app_users where email = $1 limit 1',
      [email]
    ));
  } catch (e: any) {
    // Typicky: tabuľky ešte neboli inicializované cez /setup-db
    if (String(e?.code ?? '') === '42P01') {
      return NextResponse.json(
        { error: 'Databáza nie je inicializovaná. Otvor /setup-db a klikni „Vytvoriť tabuľku“.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Chyba databázy.' }, { status: 500 });
  }
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Neplatné prihlasovacie údaje.' }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = signJwt(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      exp: now + 60 * 60 * 24 * 7, // 7 dní
    },
    now
  );

  return NextResponse.json({ token });
}

