-- =====================================================================
-- The Surprise & Curate Studio — Initial Database Schema
-- Run this once in Supabase SQL Editor (or via `supabase db push`)
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. ADMIN USERS  (username + bcrypt password, NOT Supabase auth)
-- =====================================================================
create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password_hash text not null,        -- bcrypt hash, generated server-side, never plaintext
  full_name text,
  is_active boolean default true,
  created_at timestamptz default now()
);
-- No public policies at all — admin_users is only ever touched by
-- /api serverless functions using the SUPABASE_SERVICE_ROLE_KEY.
alter table admin_users enable row level security;

-- =====================================================================
-- 2. SERVICE ADD-ONS  (admin-managed, not hardcoded)
-- =====================================================================
create table if not exists addons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  unit_label text default 'per item',   -- e.g. "per card", "per bag"
  is_active boolean default true,       -- visible to customers
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table addons enable row level security;

create policy "Public can read active addons"
  on addons for select
  using (is_active = true);
-- Insert/update/delete only via service-role admin API (no policy = blocked for anon/auth).

-- =====================================================================
-- 3. FRIDGE MAGNET TYPES  (admin-managed dropdown, mirrors addons pattern)
-- =====================================================================
create table if not exists magnet_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                  -- Square Magnet, Rectangle Magnet, Acrylic Magnet...
  is_active boolean default true,
  sort_order int default 0
);
alter table magnet_types enable row level security;
create policy "Public can read active magnet types"
  on magnet_types for select using (is_active = true);

-- =====================================================================
-- 4. TERMS & CONDITIONS  (versioned, admin publishes new active version)
-- =====================================================================
create table if not exists terms_versions (
  id uuid primary key default uuid_generate_v4(),
  version_number int not null,
  content text not null,               -- markdown / plain text of the terms
  is_active boolean default false,     -- only ONE row should be true at a time
  created_at timestamptz default now()
);
alter table terms_versions enable row level security;
create policy "Public can read active terms"
  on terms_versions for select using (is_active = true);

-- =====================================================================
-- 5. APP SETTINGS  (key-value store: advance payment rules, UPI id, etc.)
-- =====================================================================
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table app_settings enable row level security;
create policy "Public can read settings"
  on app_settings for select using (true);

-- Seed default settings
insert into app_settings (key, value) values
  ('upi_id', '"9940159165@ybl"'),
  ('advance_payment', '{"enabled": true, "type": "percentage", "value": 30, "min_amount": 500}'),
  ('company', '{"name": "The Surprise & Curate Studio", "phone": "9940159165", "maps_link": ""}')
on conflict (key) do nothing;

-- =====================================================================
-- 6. BOOKINGS  (core table)
-- =====================================================================
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  booking_code text unique not null default ('SCS-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,5)),

  -- customer / auth
  customer_user_id uuid not null,       -- auth.uid() from Supabase Google login
  customer_name text not null,
  customer_email text not null,
  customer_mobile text not null,

  -- event info
  event_type text not null,             -- Wedding / Reception / Engagement / Birthday / Corporate / Other
  event_date date not null,
  event_time text not null,
  guest_count int,
  event_venue text,
  event_city text,
  event_maps_link text,                 -- optional

  -- service
  magnet_type text not null,
  confirmed_magnet_count int not null,
  extra_magnets_range text,             -- "25-50" / "50-100" / "100-150"

  -- add-ons (snapshot at booking time, [{id,name,price,qty}])
  selected_addons jsonb default '[]',

  -- pricing
  total_amount numeric(10,2) default 0,
  advance_required numeric(10,2) default 0,
  advance_paid numeric(10,2) default 0,

  -- terms
  terms_version_id uuid references terms_versions(id),
  terms_accepted boolean default false,
  terms_accepted_at timestamptz,

  -- payment
  payment_status text default 'pending' check (payment_status in ('pending','submitted','verified','rejected')),
  payment_screenshot_path text,         -- private storage path, not a public URL
  payment_txn_id text,
  payment_datetime timestamptz,

  -- status
  booking_status text default 'pending' check (booking_status in ('pending','confirmed','finished','cancelled')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table bookings enable row level security;

create index if not exists idx_bookings_customer on bookings(customer_user_id);
create index if not exists idx_bookings_date on bookings(event_date);
create index if not exists idx_bookings_status on bookings(booking_status);

-- Customers can only see their own bookings
create policy "Customer can view own bookings"
  on bookings for select
  using (auth.uid() = customer_user_id);

-- Customers can create their own bookings only
create policy "Customer can insert own booking"
  on bookings for insert
  with check (auth.uid() = customer_user_id);

-- Customers may update ONLY their own pending booking's payment fields
-- (screenshot upload happens right after submit); enforced further in API layer.
create policy "Customer can update own pending booking payment info"
  on bookings for update
  using (auth.uid() = customer_user_id and booking_status = 'pending')
  with check (auth.uid() = customer_user_id);

-- Admin (service role, bypasses RLS entirely) manages everything else via /api routes.

-- =====================================================================
-- 7. GALLERY
-- =====================================================================
create table if not exists gallery_images (
  id uuid primary key default uuid_generate_v4(),
  storage_path text not null,           -- Supabase Storage path (webp, compressed)
  category text default 'general',      -- wedding / birthday / corporate / general
  caption text,
  is_published boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table gallery_images enable row level security;
create policy "Public can read published gallery images"
  on gallery_images for select using (is_published = true);

-- =====================================================================
-- 8. STORAGE BUCKETS  (create via Supabase dashboard or storage API)
-- =====================================================================
-- gallery            -> public bucket, images compressed to WebP before upload
-- payment-screenshots -> PRIVATE bucket, accessed only via signed URLs from admin API
-- logo               -> public bucket, single logo file

-- =====================================================================
-- Done. After running this:
--   1. Create the 3 storage buckets above in Supabase Dashboard > Storage
--   2. Insert your first admin_users row using /api/admin-create (one-time script)
--   3. Insert magnet_types + addons rows to match booking_form.md
-- =====================================================================
