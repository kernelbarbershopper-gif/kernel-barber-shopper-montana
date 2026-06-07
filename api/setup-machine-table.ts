import postgres from 'postgres';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SETUP_KEY = process.env.SETUP_MACHINE_TABLE_KEY || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';

const SQL = `
CREATE TABLE IF NOT EXISTS public.machine_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID REFERENCES public.shops(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','filled','processing','shipped','delivered')),
  plan_name TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip_code TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  needs_logo_design BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.machine_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_mr_select ON public.machine_requests;
DROP POLICY IF EXISTS shop_mr_insert ON public.machine_requests;
DROP POLICY IF EXISTS shop_mr_update ON public.machine_requests;
CREATE POLICY shop_mr_select ON public.machine_requests FOR SELECT USING (auth.uid() = shop_id);
CREATE POLICY shop_mr_insert ON public.machine_requests FOR INSERT WITH CHECK (auth.uid() = shop_id);
CREATE POLICY shop_mr_update ON public.machine_requests FOR UPDATE USING (auth.uid() = shop_id);
`;

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const key = req.headers['x-setup-key'] || '';
  if (!SETUP_KEY || !timingSafeEqualStr(String(key), SETUP_KEY)) {
    return res.status(401).json({ error: 'Invalid key' });
  }

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'No service key configured' });
  }

  const dbPassword = req.headers['x-db-password'] || '';
  if (!dbPassword) {
    return res.status(400).json({
      error: 'Provide database password via x-db-password header',
      instructions: 'Get password from https://supabase.com/dashboard/project/' + (PROJECT_REF || 'YOUR_PROJECT') + '/settings/database',
    });
  }

  if (!PROJECT_REF) {
    return res.status(400).json({ error: 'Set SUPABASE_PROJECT_REF env var' });
  }

  const errors: string[] = [];
  const hosts = [
    `postgresql://postgres:${dbPassword}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres:${dbPassword}@${PROJECT_REF}.supabase.co:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  ];

  for (const dbUrl of hosts) {
    try {
      const sql = postgres(dbUrl, { ssl: 'require', max: 1, idle_timeout: 10, connect_timeout: 5 });
      await sql.unsafe(SQL);
      await sql.end({ timeout: 5 });
      return res.status(200).json({ success: true, message: 'Table created' });
    } catch (e: any) {
      errors.push(`${dbUrl.substring(0, 60)}... => ${e.message || e.code || e}`);
    }
  }
  return res.status(500).json({ error: 'All connection attempts failed', details: errors });
}
