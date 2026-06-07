// scripts/loginTest.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase URL or anon key');
  process.exit(1);
}
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD to run loginTest');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) {
    console.log('Login falhou:', loginError.message);
    return;
  }
  console.log('Login bem sucedido! Session token:', loginData.session?.access_token?.slice(0, 10) + '...');
}
main();
