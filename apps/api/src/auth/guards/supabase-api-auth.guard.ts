import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { env } from '../../config/env';

export interface RequestUser {
  id: string;
  email?: string;
  role: string;
}

/**
 * Overí JWT cez Supabase Auth API (GET /auth/v1/user).
 * Nepotrebuje SUPABASE_JWT_SECRET – funguje aj s novými JWKS kľúčmi.
 */
@Injectable()
export class SupabaseApiAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Chýba token');
    }

    const url = `${env.supabaseUrl}/auth/v1/user`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.supabaseAnonKey,
      },
    });

    if (!res.ok) {
      throw new UnauthorizedException('Neplatný alebo expirovaný token');
    }

    const user = await res.json();
    request.user = {
      id: user.id,
      email: user.email,
      role: user.role ?? 'authenticated',
    } as RequestUser;

    return true;
  }
}
