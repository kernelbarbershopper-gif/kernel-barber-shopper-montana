import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Supabase URL or anon key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  // Sign in as admin
  const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
    email: 'kernelbarbershopper@gmail.com',
    password: 'M@1dasilva',
  });
  if (signInError) {
    console.error('Sign‑in error:', signInError);
    process.exit(1);
  }
  console.log('Signed in as admin');

  // Delete all shops (soft? hard delete)
  // Fetch all shop IDs, then delete each individually (bypass RLS restrictions per-row)
  const { data: shopsData, error: fetchError } = await supabase.from('shops').select('id');
  if (fetchError) {
    console.error('Fetch shops error:', fetchError);
    process.exit(1);
  }
  if (!shopsData || shopsData.length === 0) {
    console.log('No shops to delete');
    return;
  }
  let deletedCount = 0;
  for (const shop of shopsData) {
    const { error: delError } = await supabase.from('shops').delete().eq('id', shop.id);
    if (delError) {
      console.error('Delete error for id', shop.id, delError);
    } else {
      deletedCount++;
    }
  }
  console.log('Deleted shops count:', deletedCount);

  // No further error handling needed here
}

run().catch(e => {
  console.error('Unexpected error', e);
  process.exit(1);
});
