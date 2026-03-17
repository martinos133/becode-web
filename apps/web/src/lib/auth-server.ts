import 'server-only';
import { NextRequest } from 'next/server';
import { verifyJwt, JwtPayload } from '@/lib/jwt';

export function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export function requireAuth(req: NextRequest): JwtPayload {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error('Chýba token');
  }
  return verifyJwt(token);
}

