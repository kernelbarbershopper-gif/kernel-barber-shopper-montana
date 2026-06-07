// scripts/createAdminUser.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}
if (!email || !password) {
  console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  console.error('   Generate a strong password (e.g. `openssl rand -base64 24`) and store it in a password manager.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('❌ ADMIN_PASSWORD must be at least 12 characters');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });
  if (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    process.exit(1);
  }
  console.log('✅ Usuário admin criado com sucesso. ID:', data?.user?.id);
}
main();
