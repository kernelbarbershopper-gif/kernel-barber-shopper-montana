// scripts/deleteShops.ts
// DESTRUCTIVE: drops every shop row. Refuses to run unless ALLOW_DESTRUCTIVE=1.
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (process.env.ALLOW_DESTRUCTIVE !== '1') {
  console.error('❌ Refusing to run: set ALLOW_DESTRUCTIVE=1 to confirm deletion of ALL shops.');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!supabaseUrl || !anonKey || !email || !password) {
  console.error('Missing Supabase config or ADMIN_EMAIL/ADMIN_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign-in error:', signInError);
    process.exit(1);
  }
  console.log('Signed in as admin');

  const { data: shopsData, error: fetchError } = await supabase.from('shops').select('id');
  if (fetchError) { console.error('Fetch shops error:', fetchError); process.exit(1); }
  if (!shopsData?.length) { console.log('No shops to delete'); return; }

  let deletedCount = 0;
  for (const shop of shopsData) {
    const { error: delError } = await supabase.from('shops').delete().eq('id', shop.id);
    if (delError) console.error('Delete error for id', shop.id, delError);
    else deletedCount++;
  }
  console.log('Deleted shops count:', deletedCount);
}
run().catch(e => { console.error('Unexpected error', e); process.exit(1); });
