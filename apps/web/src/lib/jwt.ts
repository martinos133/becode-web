import 'server-only';
import crypto from 'crypto';

type JwtHeader = { alg: 'HS256'; typ: 'JWT' };

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function getJwtSecretKey(): Buffer {
  const raw = process.env.AUTH_JWT_SECRET?.trim();
  if (!raw) throw new Error('AUTH_JWT_SECRET nie je nastavený.');

  // Ak vyzerá ako base64, použijeme base64 decode; inak raw bytes.
  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 32;
  if (looksBase64) {
    try {
      return Buffer.from(raw, 'base64');
    } catch {
      // fallback
    }
  }
  return Buffer.from(raw, 'utf8');
}

export type JwtPayload = Record<string, unknown> & {
  sub: string;
  email?: string;
  role?: string;
  iat: number;
  exp: number;
};

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'> & { exp: number }, nowSec = Math.floor(Date.now() / 1000)): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtPayload = {
    ...(payload as any),
    iat: nowSec,
  };

  const headerPart = base64UrlEncode(JSON.stringify(header));
  const payloadPart = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${headerPart}.${payloadPart}`;
  const sig = crypto.createHmac('sha256', getJwtSecretKey()).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

export function verifyJwt(token: string, nowSec = Math.floor(Date.now() / 1000)): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Neplatný formát tokenu.');
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', getJwtSecretKey()).update(data).digest();
  const given = base64UrlDecodeToBuffer(s);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error('Neplatný podpis tokenu.');
  }
  const payloadJson = base64UrlDecodeToBuffer(p).toString('utf8');
  const payload = JSON.parse(payloadJson) as JwtPayload;
  if (!payload?.sub) throw new Error('Token nemá subject.');
  if (typeof payload.exp !== 'number') throw new Error('Token nemá exp.');
  if (payload.exp < nowSec) throw new Error('Token expiroval.');
  return payload;
}

