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
  note text not null check (
    char_length(note) between 1 and 600
    and note !~* '(https?://\S+.*https?://\S+)'          -- no multi-link floods
    and note !~* '\y(viagra|onlyfans|free followers)\y'  -- server-side backstop; the
                                                          -- real word list lives in
                                                          -- assets/moderation.js on the client
  ),
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
  body text not null check (
    char_length(body) between 1 and 20000
    and body !~* '(https?://\S+.*https?://\S+.*https?://\S+)'
    and body !~* '\y(viagra|onlyfans|free followers)\y'
  ),
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
  user_id uuid references profiles(id) on delete cascade,
  action text not null,
  created_at timestamptz default now(),
  unique (user_id, action)  -- signing the same action twice doesn't inflate the tally
);

alter table pledges enable row level security;

create policy "Pledges are publicly readable"
  on pledges for select using (true);

-- Signing requires an account (auth.uid() is not null). This is the single
-- biggest anti-spam lever for the public tally: it turns "anonymous form on
-- the internet" (bot magnet) into "one pledge per real account."
create policy "Logged-in users can sign the pledge"
  on pledges for insert with check (auth.uid() = user_id);


-- ============================================================
-- BOT / SPAM HARDENING — do these two in the Supabase dashboard,
-- they can't be done from SQL:
--
-- 1. Authentication → Providers → Email → turn "Confirm email"
--    BACK ON before you launch for real. It's off in the 5-minute
--    setup purely to make demo/testing faster; a working inbox
--    per signup is one of the cheapest bot filters that exists.
--
-- 2. Authentication → Attack Protection → enable CAPTCHA
--    (hCaptcha or Cloudflare Turnstile, both free). This is what
--    actually stops scripted mass account creation — the
--    honeypot + word-filter in assets/moderation.js only catch
--    unsophisticated bots and bad language, not a determined one.
-- ============================================================


-- MEDIA STORAGE (journal photos + blog cover images) ------------
-- One public bucket, split into "journal/{user_id}/…" and
-- "covers/{user_id}/…" folders so the RLS policies below can
-- restrict uploads to a user's own folder with a single rule.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Media is publicly readable"
  on storage.objects for select using (bucket_id = 'media');

create policy "Users can upload to their own media folder"
  on storage.objects for insert with check (
    bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can replace their own media"
  on storage.objects for update using (
    bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete their own media"
  on storage.objects for delete using (
    bucket_id = 'media' and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Paths look like: journal/<user_id>/<timestamp>-<filename>.jpg
-- storage.foldername(name) splits that into an array, e.g.
-- ARRAY['journal','<user_id>'], so index [2] is the user id folder.
-- The 5MB / image-type limits above are enforced by Postgres itself,
-- not just the client filter in assets/moderation.js — someone
-- calling the storage API directly still can't bypass them.
