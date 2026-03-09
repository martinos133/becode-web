import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    const key = env.supabaseServiceRoleKey ?? env.supabaseAnonKey;
    this.supabase = createClient(env.supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async createUser(email: string, password: string): Promise<{ userId?: string; error?: string }> {
    const key = env.supabaseServiceRoleKey;
    if (!key) {
      return { error: 'SUPABASE_SERVICE_ROLE_KEY nie je nastavený. Nastav ho v apps/api/.env' };
    }
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });
    if (error) {
      return { error: error.message };
    }
    return { userId: data.user?.id };
  }
}
