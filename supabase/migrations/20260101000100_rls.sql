-- =====================================================================
-- 002_rls.sql — Row Level Security policies
-- =====================================================================
-- Default posture: deny all. Owners can read/write their shop data. Public
-- can read barbers and inventory (for Loja Online) and create appointments
-- (no auth required for booking).
-- =====================================================================

alter table public.shops enable row level security;
alter table public.plans enable row level security;
alter table public.barbers enable row level security;
alter table public.inventory enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.machine_requests enable row level security;
alter table public.settings enable row level security;
alter table public.profiles enable row level security;

-- Helper: is_admin() returns true if the calling user has the 'admin' or
-- 'superadmin' role in public.profiles.
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','superadmin')
  );
$$;

-- ----- plans: public read, admin write -----
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans for select using (is_active = true or is_admin());
drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans for all using (is_admin()) with check (is_admin());

-- ----- shops: owner read/write, admin all -----
drop policy if exists shops_owner_select on public.shops;
create policy shops_owner_select on public.shops for select using (owner_id = auth.uid() or is_admin());
drop policy if exists shops_owner_write on public.shops;
create policy shops_owner_write on public.shops for all using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid() or is_admin());

-- ----- barbers: public read, owner write -----
drop policy if exists barbers_public_select on public.barbers;
create policy barbers_public_select on public.barbers for select using (active = true);
drop policy if exists barbers_owner_write on public.barbers;
create policy barbers_owner_write on public.barbers for all
  using (
    exists (select 1 from public.shops s where s.id = barbers.shop_id and (s.owner_id = auth.uid() or is_admin()))
  )
  with check (
    exists (select 1 from public.shops s where s.id = barbers.shop_id and (s.owner_id = auth.uid() or is_admin()))
  );

-- ----- inventory: public read, owner write -----
drop policy if exists inventory_public_select on public.inventory;
create policy inventory_public_select on public.inventory for select using (true);
drop policy if exists inventory_owner_write on public.inventory;
create policy inventory_owner_write on public.inventory for all
  using (
    exists (select 1 from public.shops s where s.id = inventory.shop_id and (s.owner_id = auth.uid() or is_admin()))
  )
  with check (
    exists (select 1 from public.shops s where s.id = inventory.shop_id and (s.owner_id = auth.uid() or is_admin()))
  );

-- ----- appointments: public insert (anon can book), owner/admin manage -----
drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert on public.appointments for insert with check (true);
drop policy if exists appointments_public_select on public.appointments;
create policy appointments_public_select on public.appointments for select using (true);
drop policy if exists appointments_owner_update on public.appointments;
create policy appointments_owner_update on public.appointments for update
  using (
    exists (select 1 from public.shops s where s.id = appointments.shop_id and (s.owner_id = auth.uid() or is_admin()))
  );

-- ----- payments: owner read/admin all, no anon -----
drop policy if exists payments_owner_select on public.payments;
create policy payments_owner_select on public.payments for select
  using (
    email = (select email from auth.users where id = auth.uid()) or is_admin()
  );
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments for all using (is_admin()) with check (is_admin());

-- ----- subscriptions: owner read -----
drop policy if exists subs_owner_select on public.subscriptions;
create policy subs_owner_select on public.subscriptions for select
  using (email = (select email from auth.users where id = auth.uid()) or is_admin());
drop policy if exists subs_admin_write on public.subscriptions;
create policy subs_admin_write on public.subscriptions for all using (is_admin()) with check (is_admin());

-- ----- withdrawals: owner CRUD own, admin manage -----
drop policy if exists wd_owner_all on public.withdrawals;
create policy wd_owner_all on public.withdrawals for all
  using (
    exists (select 1 from public.shops s where s.id = withdrawals.shop_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.shops s where s.id = withdrawals.shop_id and s.owner_id = auth.uid())
  );
drop policy if exists wd_admin_update on public.withdrawals;
create policy wd_admin_update on public.withdrawals for update using (is_admin());

-- ----- machine_requests: shop owner (auth.uid maps to shop via profiles) -----
drop policy if exists mr_owner_all on public.machine_requests;
create policy mr_owner_all on public.machine_requests for all
  using (
    exists (select 1 from public.shops s where s.id = machine_requests.shop_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.shops s where s.id = machine_requests.shop_id and s.owner_id = auth.uid())
  );

-- ----- settings: public read, admin write -----
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings for select using (true);
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for update using (is_admin());

-- ----- profiles: owner self, admin all -----
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
