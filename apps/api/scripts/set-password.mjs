/**
 * Nastaví heslo používateľa v Supabase (cez service_role).
 * Spustenie: cd apps/api && node scripts/set-password.mjs [email]
 * Vyžaduje SUPABASE_SERVICE_ROLE_KEY v .env.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envLocalPath = join(__dirname, '..', '.env.local');

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf-8')
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = { ...loadEnv(envPath), ...loadEnv(envLocalPath) };
const url = env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Do .env pridaj SUPABASE_URL a SUPABASE_SERVICE_ROLE_KEY (Project Settings → API).');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const email = process.argv[2] || 'muha@becode.sk';
const password = 'Welcome2025+';

async function main() {
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Chyba pri načítaní používateľov:', listError.message);
    process.exit(1);
  }
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error('Používateľ s e-mailom', email, 'nebol nájdený.');
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error('Chyba pri nastavení hesla:', error.message);
    process.exit(1);
  }
  console.log('Heslo nastavené pre:', data.user?.email);
  console.log('Prihlásenie: email =', email, ', heslo =', password);
}

main();
