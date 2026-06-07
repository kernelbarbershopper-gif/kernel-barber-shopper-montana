// Consolidated migration. Replaces setup.sql, setup-payload.json, setup-mr.json.
// Apply via Supabase SQL editor or `supabase db push` after `supabase init`.

-- =====================================================================
-- 001_init.sql — base schema for KERNEL BARBER SHOPPER
-- =====================================================================

create extension if not exists "pgcrypto";

-- ----- shops -----
create table if not exists public.shops (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text,
  owner_email text,
  plan text default 'free',
  status text default 'active' check (status in ('active', 'suspended', 'cancelled')),
  balance numeric(10,2) default 0,
  plan_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----- plans -----
create table if not exists public.plans (
  id text primary key,
  name text not null,
  price numeric(10,2) not null default 0,
  interval text default 'monthly' check (interval in ('monthly','yearly')),
  features jsonb default '[]'::jsonb,
  trial_days int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----- barbers -----
create table if not exists public.barbers (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  slug text unique,
  name text not null,
  bio text,
  image_url text,
  instagram text,
  whatsapp text,
  haircut_styles jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- ----- inventory -----
create table if not exists public.inventory (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  name text not null,
  category text,
  price numeric(10,2) default 0,
  quantity int default 0,
  image_url text,
  created_at timestamptz default now()
);

-- ----- appointments -----
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  professional_id uuid references public.barbers(id) on delete set null,
  user_name text,
  user_phone text,
  service_name text,
  service_price numeric(10,2) default 0,
  date timestamptz,
  status text default 'pending' check (status in ('pending','confirmed','done','cancelled')),
  notes text,
  created_at timestamptz default now()
);

-- ----- payments -----
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  order_id text unique,
  charge_id text,
  reference_id text,
  plan_id text,
  shop_id uuid references public.shops(id) on delete set null,
  email text,
  amount numeric(10,2),
  status text,
  customer_id text,
  pix_text text,
  payment_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----- subscriptions -----
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  asaas_subscription_id text unique,
  asaas_payment_id text,
  asaas_customer_id text,
  shop_id uuid references public.shops(id) on delete set null,
  plan_id text,
  email text,
  status text,
  value numeric(10,2),
  cycle text,
  payment_method text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

-- ----- withdrawals -----
create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  amount numeric(10,2) not null,
  pix_key text not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  requested_at timestamptz default now(),
  processed_at timestamptz
);

-- ----- machine_requests -----
create table if not exists public.machine_requests (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending','filled','processing','shipped','delivered')),
  plan_name text default '',
  full_name text default '',
  phone text default '',
  address text default '',
  city text default '',
  state text default '',
  zip_code text default '',
  logo_url text default '',
  needs_logo_design boolean default false,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----- settings (global) -----
create table if not exists public.settings (
  id int primary key default 1,
  system_online boolean default true,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into public.settings (id, system_online) values (1, true) on conflict (id) do nothing;

-- ----- profiles (linked to auth.users) -----
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  role text default 'user' check (role in ('user','admin','superadmin')),
  shop_id uuid references public.shops(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
