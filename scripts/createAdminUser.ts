// scripts/createAdminUser.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
console.log('SUPABASE_URL:', supabaseUrl);

const serviceKey = process.env.SUPABASE_SERVICE_KEY;
console.log('SUPABASE_SERVICE_KEY length:', serviceKey?.length);


if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY precisam estar definidas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const email = 'kernelbarbershopper@gmail.com';
  const password = 'M@1dasilva';

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // opcional: metadata para identificar admin
    // user_metadata: { role: 'admin' }
  });

  if (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    process.exit(1);
  }

  console.log('✅ Usuário admin criado com sucesso. ID:', data?.user?.id);
}

main();
