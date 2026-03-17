import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { dbQuery } from '../db/db';

@Injectable()
export class AuthService {
  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, 'sha256').toString('hex');
    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async createUser(email: string, password: string): Promise<{ userId?: string; error?: string }> {
    const normalized = email.trim().toLowerCase();
    const passwordHash = this.hashPassword(password);
    try {
      const { rows } = await dbQuery<{ id: number }>(
        'insert into public.app_users (email, password_hash, role) values ($1,$2,$3) returning id',
        [normalized, passwordHash, 'authenticated']
      );
      return { userId: String(rows[0]?.id) };
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        return { error: 'Používateľ s týmto e-mailom už existuje.' };
      }
      return { error: 'Nepodarilo sa vytvoriť používateľa.' };
    }
  }

  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
    const normalized = email.trim().toLowerCase();
    const { rows } = await dbQuery<{ id: number; email: string; password_hash: string; role: string }>(
      'select id, email, password_hash, role from public.app_users where email=$1 limit 1',
      [normalized]
    );
    const user = rows[0];
    if (!user) return null;
    if (!this.verifyPassword(password, user.password_hash)) return null;
    return { id: String(user.id), email: user.email, role: user.role ?? 'authenticated' };
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = this.hashPassword(newPassword);
    await dbQuery('update public.app_users set password_hash=$1 where id=$2', [passwordHash, Number(userId)]);
  }
}
