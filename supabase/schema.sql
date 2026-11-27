-- Das PG Management — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor when upgrading from Local IndexedDB to Supabase Cloud.

create extension if not exists "pgcrypto";

-- 1. PG Settings
create table if not exists public.pg_settings (
  id text primary key default 'default',
  owner_id uuid references auth.users(id) on delete cascade,
  pg_name text not null default 'Das PG',
  pg_address text not null default '',
  owner_phone text not null default '',
  default_rent numeric not null default 0,
  default_billing_day integer not null default 5 check (default_billing_day between 1 and 28),
  electricity_billing_mode text not null default 'manual',
  electricity_rate_per_unit numeric not null default 0,
  electricity_note text not null default '',
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);

-- 2. Rooms (Room 1 to Room 10)
create table if not exists public.rooms (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  room_number integer not null unique check (room_number between 1 and 10),
  floor text not null default 'Ground Floor',
  capacity integer not null default 2,
  status text not null default 'vacant' check (status in ('occupied', 'vacant')),
  monthly_rent numeric not null default 0,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

-- 3. Room History
create table if not exists public.room_history (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  room_number integer not null check (room_number between 1 and 10),
  date timestamptz not null default now(),
  type text not null,
  description text not null,
  tenant_id text,
  tenant_name text,
  amount numeric
);

-- 4. Tenants
create table if not exists public.tenants (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  room_number integer not null check (room_number between 1 and 10),
  joining_date date not null,
  monthly_rent numeric not null default 0,
  security_deposit numeric not null default 0,
  emergency_contact text not null default '',
  address text not null default '',
  id_document_type text not null default '',
  id_document_number text not null default '',
  notes text not null default '',
  status text not null default 'active' check (status in ('active', 'moved_out')),
  move_out_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Monthly Bills (unique per room_number + billing_month to prevent duplicates)
create table if not exists public.monthly_bills (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  room_number integer not null check (room_number between 1 and 10),
  billing_month text not null, -- YYYY-MM
  tenant_ids jsonb not null default '[]'::jsonb,
  tenant_names text not null default '',
  rent_amount numeric not null default 0,
  electricity_bill numeric not null default 0,
  other_charges numeric not null default 0,
  other_charges_note text not null default '',
  previous_due numeric not null default 0,
  total_payable numeric not null default 0,
  amount_paid numeric not null default 0,
  remaining_due numeric not null default 0,
  status text not null default 'unpaid' check (status in ('paid', 'partial', 'unpaid')),
  due_date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_number, billing_month)
);

-- 6. Payments
create table if not exists public.payments (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  receipt_number text not null unique,
  bill_id text references public.monthly_bills(id) on delete set null,
  tenant_id text not null,
  tenant_name text not null,
  room_number integer not null check (room_number between 1 and 10),
  payment_date date not null,
  billing_month text not null,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('Cash', 'UPI', 'Bank Transfer', 'Other')),
  transaction_id text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- 7. Expenses
create table if not exists public.expenses (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  amount numeric not null check (amount >= 0),
  category text not null,
  date date not null,
  description text not null default '',
  receipt_data_url text,
  receipt_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security (Admin-only access)
alter table public.pg_settings enable row level security;
alter table public.rooms enable row level security;
alter table public.room_history enable row level security;
alter table public.tenants enable row level security;
alter table public.monthly_bills enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Authenticated admin policies (owner_id = auth.uid())
create policy "Admin owns pg_settings" on public.pg_settings for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns rooms" on public.rooms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns room_history" on public.room_history for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns tenants" on public.tenants for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns monthly_bills" on public.monthly_bills for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns payments" on public.payments for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Admin owns expenses" on public.expenses for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
