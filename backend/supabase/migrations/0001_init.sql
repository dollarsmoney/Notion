-- Marketplace core schema: profiles, products, orders, order_items, payments.

create extension if not exists "pgcrypto";

create type user_role as enum ('user', 'vendor');
create type product_status as enum ('draft', 'active', 'inactive');
create type order_status as enum ('pending', 'paid', 'failed', 'cancelled', 'fulfilled');
create type payment_status as enum ('pending', 'success', 'failed', 'abandoned');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on profiles (role);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Mirrors every auth.users row into profiles, taking the role chosen at sign-up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'vendor' then 'vendor'::user_role
      else 'user'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Users may edit their profile but never promote themselves to vendor.
create or replace function prevent_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_role
  before update on profiles
  for each row execute function prevent_role_change();

-- ---------------------------------------------------------------- products

create table products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null,
  image_url text,
  stock integer not null default 0,
  status product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(btrim(name)) > 0),
  constraint products_price_non_negative check (price >= 0),
  constraint products_stock_non_negative check (stock >= 0)
);

create index products_vendor_id_idx on products (vendor_id);
create index products_status_idx on products (status);
create index products_created_at_idx on products (created_at desc);

create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- orders

create table orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references profiles (id) on delete restrict,
  total_amount numeric(12, 2) not null,
  currency text not null default 'NGN',
  status order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_non_negative check (total_amount >= 0)
);

create index orders_buyer_id_idx on orders (buyer_id);
create index orders_status_idx on orders (status);
create index orders_created_at_idx on orders (created_at desc);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- order_items

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  vendor_id uuid not null references profiles (id) on delete restrict,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  subtotal numeric(12, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_non_negative check (unit_price >= 0),
  constraint order_items_unique_product unique (order_id, product_id)
);

create index order_items_order_id_idx on order_items (order_id);
create index order_items_vendor_id_idx on order_items (vendor_id);
create index order_items_product_id_idx on order_items (product_id);

-- ---------------------------------------------------------------- payments

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  reference text not null unique,
  provider text not null default 'paystack',
  amount numeric(12, 2) not null,
  currency text not null default 'NGN',
  status payment_status not null default 'pending',
  authorization_url text,
  gateway_response text,
  paid_at timestamptz,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_non_negative check (amount >= 0)
);

create index payments_order_id_idx on payments (order_id);
create index payments_status_idx on payments (status);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ----------------------------------------------------- paid-order transition

-- Flips pending -> paid and draws down stock in one transaction. Returns false
-- if the order was already settled, which makes repeat calls (callback + webhook) safe.
create or replace function mark_order_paid(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update orders
     set status = 'paid'
   where id = p_order_id
     and status = 'pending';

  get diagnostics updated = row_count;
  if updated = 0 then
    return false;
  end if;

  update products p
     set stock = greatest(p.stock - oi.quantity, 0)
    from order_items oi
   where oi.order_id = p_order_id
     and p.id = oi.product_id;

  return true;
end;
$$;

revoke all on function mark_order_paid(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- row level security

alter table profiles enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;

-- profiles: own row only.
create policy profiles_select_own on profiles
  for select using (auth.uid() = id);

create policy profiles_update_own on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- products: anyone may browse the active catalogue; vendors manage their own.
create policy products_select_active on products
  for select using (status = 'active');

create policy products_select_own on products
  for select to authenticated using (auth.uid() = vendor_id);

create policy products_insert_own on products
  for insert to authenticated with check (auth.uid() = vendor_id);

create policy products_update_own on products
  for update to authenticated using (auth.uid() = vendor_id) with check (auth.uid() = vendor_id);

create policy products_delete_own on products
  for delete to authenticated using (auth.uid() = vendor_id);

-- orders and payments are written only by the backend service role, which
-- bypasses RLS. Buyers get read access to their own records.
create policy orders_select_own on orders
  for select to authenticated using (auth.uid() = buyer_id);

create policy payments_select_own on payments
  for select to authenticated using (
    exists (select 1 from orders o where o.id = payments.order_id and o.buyer_id = auth.uid())
  );

-- Buyers see their own lines; vendors see the lines that belong to their products.
create policy order_items_select_participant on order_items
  for select to authenticated using (
    auth.uid() = vendor_id
    or exists (select 1 from orders o where o.id = order_items.order_id and o.buyer_id = auth.uid())
  );
