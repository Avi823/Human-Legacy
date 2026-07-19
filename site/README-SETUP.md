# Human Legacy — setup guide

## What's new

- **Full visual redesign.** Same bones (the record timeline, impact cards, emissions ledger, footprint calculator, pledge tally), new "field record" look: muted moss/ochre/clay palette instead of the old neon-glow dark theme, a strata-line motif as the signature recurring element, and a calmer background (no more glowing blob soup).
- **Accounts.** Real email/password sign-up and login, powered by Supabase Auth.
- **Nature journal (streak).** Logged-in users log one observation a day. The app tracks a current streak and longest streak, and every entry also joins a public "shared field log" anyone can read.
- **Field notes (blog).** Logged-in users can publish longer posts — title, cover image, excerpt, body. Public listing + individual post pages.
- **Pledge tally** now writes to a real database table instead of resetting per browser.

New files: `journal.html`, `blog.html`, `post.html`, `assets/supabase-client.js`, `assets/auth-ui.js`, `assets/app.js`, `assets/style.css`, `assets/index.css`, `supabase-schema.sql`.

## Why Supabase

You asked for this to run as a real, self-hosted site (GitHub Pages, Netlify, etc.), which means the browser needs a real backend to talk to for accounts and shared public data — a static file alone can't do that. Supabase is a free-tier hosted Postgres database with built-in auth, callable directly from the browser with no server code of your own to run. That's what all four new features (login, journal, blog, pledge tally) are wired to.

## 5-minute setup

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is enough).
2. **Run the schema.** In your project, go to *SQL Editor → New query*, paste the entire contents of `supabase-schema.sql`, and run it. This creates the `profiles`, `journal_entries`, `blog_posts`, and `pledges` tables with row-level security already configured.
3. **Turn off email confirmation** (recommended for a demo/hackathon): *Authentication → Providers → Email* → turn off "Confirm email." With it on, new users have to click a link in their inbox before they can log in.
4. **Copy your keys.** *Project Settings → API* → copy the **Project URL** and the **anon public** key.
5. **Paste them in.** Open `assets/supabase-client.js` and replace:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   with your actual values. That's the only code edit needed — this same file is shared by every page.
6. **Deploy.** Push the whole folder to GitHub Pages, Netlify, Vercel, or any static host. No build step — it's plain HTML/CSS/JS.

Until step 5 is done, the site still loads and looks right; login/journal/blog buttons will tell people to connect Supabase instead of silently failing.

## How it fits together

- **Auth** (`assets/auth-ui.js`): one shared login/signup modal and navbar "user chip," included on every page. Session state comes from Supabase's own client-side session handling (which uses `localStorage` under the hood — normal and fine for a real hosted site).
- **Streaks**: a `journal_entries` row has a `unique (user_id, entry_date)` constraint, so a person can only log one entry per calendar day. `computeStreak()` in `auth-ui.js` walks backward from today counting consecutive days.
- **Public read, gated write**: every table is readable by anyone (so the field log, blog, and pledge tally are genuinely public), but a row can only be inserted or edited by the account that owns it — enforced by Postgres row-level security policies in `supabase-schema.sql`, not just front-end checks.

## Known limitations, on purpose

- **No password reset flow** — easy to add later with `supabase.auth.resetPasswordForEmail()`, left out to keep the auth modal simple for a hackathon build.
- **Images are by URL, not upload.** Wiring up Supabase Storage for direct photo uploads is a natural next step if you want it.
- **No comment or moderation system** on journal entries or posts — anyone with an account can publish; there's no report/delete-by-admin flow yet.
