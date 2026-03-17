import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../config/env';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.authJwtSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Neplatný token');
    }
    return {
      id: String(payload.sub),
      email: payload.email,
      role: payload.role ?? 'authenticated',
    };
  }
}

