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
}
