-- ============================================================
-- HUMAN LEGACY — Supabase schema
-- Run this once in your project's SQL editor (Supabase Dashboard
-- → SQL Editor → New query → paste → Run).
-- ============================================================

-- PROFILES ---------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are publicly readable"
  on profiles for select using (true);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);


-- JOURNAL ENTRIES (nature journal / streak) -------------------
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null default current_date,
  note text not null check (char_length(note) between 1 and 600),
  photo_url text,
  created_at timestamptz default now(),
  unique (user_id, entry_date)  -- one entry per person per day, keeps streaks honest
);

alter table journal_entries enable row level security;

create policy "Journal entries are publicly readable"
  on journal_entries for select using (true);

create policy "Users can insert their own journal entries"
  on journal_entries for insert with check (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
  on journal_entries for delete using (auth.uid() = user_id);


-- BLOG POSTS (field notes) ------------------------------------
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  slug text unique not null,
  excerpt text,
  body text not null,
  cover_url text,
  created_at timestamptz default now()
);

alter table blog_posts enable row level security;

create policy "Blog posts are publicly readable"
  on blog_posts for select using (true);

create policy "Users can insert their own posts"
  on blog_posts for insert with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on blog_posts for update using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on blog_posts for delete using (auth.uid() = user_id);


-- PLEDGES (public tally on the homepage) -----------------------
create table if not exists pledges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  created_at timestamptz default now()
);

alter table pledges enable row level security;

create policy "Pledges are publicly readable"
  on pledges for select using (true);

create policy "Anyone can sign the pledge, including anonymous visitors"
  on pledges for insert with check (true);
