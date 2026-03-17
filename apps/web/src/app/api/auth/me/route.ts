import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Chýba token' }, { status: 401 });
  }

  try {
    const payload = verifyJwt(token);
    return NextResponse.json({
      user: {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: typeof payload.role === 'string' ? payload.role : 'authenticated',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Neplatný alebo expirovaný token' }, { status: 401 });
  }
}
