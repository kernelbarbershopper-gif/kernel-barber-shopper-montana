// scripts/loginTest.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase URL or anon key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function main() {
  const email = 'kernelbarbershopper@gmail.com';
  const password = 'M@1dasilva';

  // Tenta login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

  if (loginError) {
    console.log('Login falhou:', loginError.message);
    // tenta cadastrar
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      console.error('Cadastro falhou:', signUpError.message);
      return;
    }
    console.log('Usuário cadastrado. Agora tentando login novamente...');
    const { data: login2, error: login2Error } = await supabase.auth.signInWithPassword({ email, password });
    if (login2Error) {
      console.error('Login após cadastro falhou:', login2Error.message);
    } else {
      console.log('Login bem sucedido! Session token:', login2.session?.access_token?.slice(0, 10) + '...');
    }
  } else {
    console.log('Login bem sucedido! Session token:', loginData.session?.access_token?.slice(0, 10) + '...');
  }
}

main();
