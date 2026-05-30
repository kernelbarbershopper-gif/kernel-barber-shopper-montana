import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { data, error } = await supabase.from('plans').select('id,name,price,is_active,features');
  if (error) console.error('Error', error);
  else console.log('Plans', data);
}
run();
