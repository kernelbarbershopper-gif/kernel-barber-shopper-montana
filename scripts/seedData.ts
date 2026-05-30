// scripts/seedData.ts
// Populate Supabase with example plans and shops for admin view
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function seed() {
  // Plans (id must be unique)
  const plans = [
    { id: 'free', name: 'Free', price: 0, is_active: true },
    { id: 'basic', name: 'Basic', price: 39.99, is_active: true },
    { id: 'pro', name: 'Pro', price: 79.99, is_active: true },
    { id: 'enterprise', name: 'Enterprise', price: 199.99, is_active: true },
  ];
  for (const p of plans) {
    const { error } = await supabase.from('plans').upsert(p, { onConflict: 'id' });
    if (error) console.error('Plan upsert error:', error);
  }

  // Example shops (use random UUIDs for ids)
  const shops = [
    {
      id: crypto.randomUUID(),
      name: 'Minha Barbearia',
      owner_email: 'owner1@example.com',
      plan: 'free',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Studio da Erica',
      owner_email: 'studiodaerica@gmail.com',
      plan: 'enterprise',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Meu Salão',
      owner_email: 'meusalon@example.com',
      plan: 'free',
      status: 'active',
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Lorrayne Silva',
      owner_email: 'lorraynesilva@gmail.com',
      plan: 'enterprise',
      status: 'active',
      created_at: new Date().toISOString(),
    },
  ];

  for (const s of shops) {
    const { error } = await supabase.from('shops').upsert(s, { onConflict: 'id' });
    if (error) console.error('Shop upsert error:', error);
  }

  console.log('✅ Seed completed');
}

seed().catch((e) => {
  console.error('❌ Seed failed', e);
  process.exit(1);
});
