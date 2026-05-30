import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { getActiveShopsCount, getMRR, getNewShopsLast30Days, getTotalUsersCount } from '../src/services/dbService';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
  console.error('Missing supabase config');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, anonKey);

// Overwrite exported functions to use this supabase instance? They import supabase from a shared module. Let's import the dbService directly which uses the same supabase instance via .env? It likely creates its own client using the same env variables.

(async () => {
  const activeShops = await getActiveShopsCount();
  const mrr = await getMRR();
  const totalUsers = await getTotalUsersCount();
  const newShops30d = await getNewShopsLast30Days();
  console.log('Stats:', { activeShops, mrr, totalUsers, newShops30d });
})();
