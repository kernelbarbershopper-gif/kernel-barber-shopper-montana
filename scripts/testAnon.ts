import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
console.log('Supabase URL', supabaseUrl);
console.log('Anon key length', anonKey?.length);

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { data, error } = await supabase.from('shops').select('id,name,email,plan').limit(5);
  if (error) console.error('Error', error);
  else console.log('Data', data);
}

run();
