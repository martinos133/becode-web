/**
 * Vytvorí používateľa v Supabase Auth.
 * Spustenie: z priečinka apps/api: node scripts/create-user.mjs
 * Vyžaduje SUPABASE_SERVICE_ROLE_KEY v .env (Supabase Dashboard → Project Settings → API).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

if (!existsSync(envPath)) {
  console.error('Chýba súbor .env v apps/api. Skopíruj .env.example a doplň SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      return [key, val];
    })
);

const url = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.SUPABASE_ANON_KEY;

if (!url) {
  console.error('V .env nastav SUPABASE_URL.');
  process.exit(1);
}

const useAdmin = !!serviceRoleKey;
const key = serviceRoleKey || anonKey;
if (!key) {
  console.error('V .env nastav SUPABASE_SERVICE_ROLE_KEY (alebo aspoň SUPABASE_ANON_KEY pre signUp).');
  console.error('Service role: Supabase Dashboard → Project Settings → API.');
  process.exit(1);
}

if (!useAdmin) {
  console.log('Používam anon key (signUp). Ak máš SUPABASE_SERVICE_ROLE_KEY, pridaj ho do .env pre vytvorenie bez potvrdenia e-mailu.');
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const email = 'muha@becode.sk';
const password = 'Welcome2025+';

async function main() {
  if (useAdmin) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log('Používateľ', email, 'už v Supabase Auth existuje. Môžeš sa prihlásiť.');
        return;
      }
      console.error('Chyba:', error.message);
      process.exit(1);
    }
    console.log('Používateľ vytvorený:', data.user?.email);
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (error.message?.includes('already registered')) {
        console.log('Používateľ', email, 'už existuje. Skús sa prihlásiť alebo obnoviť heslo.');
        return;
      }
      console.error('Chyba:', error.message);
      process.exit(1);
    }
    if (data.user && !data.session) {
      console.log('Účet vytvorený. Ak má Supabase zapnuté potvrdenie e-mailu, skontroluj', email);
    } else {
      console.log('Používateľ vytvorený a prihlásený:', data.user?.email);
    }
  }
  console.log('Prihlásenie: email =', email, ', heslo =', password);
}

main();
