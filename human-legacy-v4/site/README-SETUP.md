# Human Legacy — setup guide

## What's new in this pass

- **Real photo uploads.** Journal entries and blog cover images now use an actual file picker with a live preview instead of a "paste a URL" field. Files upload to Supabase Storage and the site stores the resulting public URL — same as before, just no longer dependent on the photo already being hosted somewhere else.
- Everything from the previous pass is still here: the two new "Legacy" sections, the live Stories feed, and the anti-spam system (honeypot + bot-speed check + word/spam filter, login-gated pledges).

New/changed files this pass: `supabase-schema.sql` (storage bucket + policies), `assets/moderation.js` (`validateImageFile`, `uploadPhoto`, `sanitizeFilename`), `assets/style.css` (upload preview styles), `journal.html` / `blog.html` (file input + preview replacing the URL field).

## Why Supabase

You asked for this to run as a real, self-hosted site (GitHub Pages, Netlify, etc.), which means the browser needs a real backend to talk to for accounts and shared public data — a static file alone can't do that. Supabase is a free-tier hosted Postgres database with built-in auth and file storage, callable directly from the browser with no server code of your own to run. That's what login, journal, blog, pledges, and now photo uploads are all wired to.

## 5-minute setup

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is enough — Storage is included, 1GB on the free tier).
2. **Run the schema.** In your project, go to *SQL Editor → New query*, paste the entire contents of `supabase-schema.sql`, and run it. This creates the `profiles`, `journal_entries`, `blog_posts`, and `pledges` tables (with row-level security and content constraints) **and** a public `media` storage bucket with upload policies scoped to each user's own folder.
3. **Turn off email confirmation while you're testing** (recommended for a demo/hackathon): *Authentication → Providers → Email* → turn off "Confirm email." **Turn this back on before a real launch** — see "Bot hardening" below.
4. **Copy your keys.** *Project Settings → API* → copy the **Project URL** and the **anon public** key.
5. **Paste them in.** Open `assets/supabase-client.js` and replace:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   with your actual values. That's the only code edit needed — this same file is shared by every page.
6. **Deploy.** Push the whole folder to GitHub Pages, Netlify, Vercel, or any static host. No build step — it's plain HTML/CSS/JS.

Until step 5 is done, the site still loads and looks right; login/journal/blog/pledge buttons will tell people to connect Supabase instead of silently failing, and the homepage Stories section shows a "connect Supabase" placeholder instead of pretending there's content.

## How it fits together

- **Auth** (`assets/auth-ui.js`): one shared login/signup modal and navbar "user chip," included on every page. Session state comes from Supabase's own client-side session handling (which uses `localStorage` under the hood — normal and fine for a real hosted site).
- **Streaks**: a `journal_entries` row has a `unique (user_id, entry_date)` constraint, so a person can only log one entry per calendar day. `computeStreak()` in `auth-ui.js` walks backward from today counting consecutive days.
- **Public read, gated write**: every table is readable by anyone (so the field log, blog, homepage Stories feed, and pledge tally are genuinely public), but a row can only be inserted or edited by the account that owns it — enforced by Postgres row-level security policies in `supabase-schema.sql`, not just front-end checks.
- **Photo uploads** (`assets/moderation.js` → `uploadPhoto()`): a chosen file is validated client-side (type + 5MB size cap), uploaded to the `media` bucket under `journal/<user_id>/…` or `covers/<user_id>/…`, and its public URL is what actually gets saved in `photo_url` / `cover_url` — the database columns didn't need to change. Storage RLS policies restrict uploads to a user's own folder and enforce the same type/size limits server-side, so the client check can't be bypassed by calling the API directly.
- **Stories on the homepage** (`index.html`): pulls the 3 latest blog posts and 4 latest journal entries live from Supabase, same data as `blog.html`/`journal.html`, just a smaller preview with a link to each full page.

## Bot hardening — what's in place and what to add

**Already wired in (`assets/moderation.js`):**
- A honeypot field on signup, journal entries, and blog posts — invisible to real users, but bots that auto-fill every field trip it and get silently rejected.
- A "too fast to be human" check — a submission within ~2.5 seconds of the form appearing is treated as scripted.
- A blocked-word and spam-pattern filter (profanity, slurs, multi-link floods, character flooding, promo spam phrases) that blocks the submission client-side with a plain-language reason.
- Matching `check` constraints in `supabase-schema.sql` as a server-side backstop, so the filter can't be bypassed by calling the API directly.
- Pledges require a logged-in account and can't be duplicated per action — this was the one place bots could previously write data with no account at all.
- Uploaded images are type- and size-checked both client-side and by the storage bucket itself.

**Worth adding before a public launch, from strongest to weakest:**
1. **Supabase CAPTCHA** (*Authentication → Attack Protection*, hCaptcha or Cloudflare Turnstile, both free) — the actual stop for a determined, scripted bot. The honeypot only catches unsophisticated ones.
2. **Keep email confirmation on** — a working inbox per signup is one of the cheapest bot filters that exists.
3. **A real moderation queue** — right now bad content is *blocked outright* client + server side; there's no "flag for human review" step or admin panel. For a hackathon/demo this is fine. For anything with real traffic, a `moderation_status` column plus a small admin view (or an API-based filter like Google's Perspective API or OpenAI's moderation endpoint, called from a Supabase Edge Function so the logic can't be bypassed from the browser) is the natural next step — this would apply to uploaded images too, since neither the client filter nor the storage bucket look at what's actually *in* a photo, only its type and size.
4. Expand the word list in `assets/moderation.js` — it's intentionally short and generic; you know your audience better than a generic list does.

## Known limitations, on purpose

- **No password reset flow** — easy to add later with `supabase.auth.resetPasswordForEmail()`, left out to keep the auth modal simple for a hackathon build.
- **No human moderation queue** — see "Bot hardening" above. Bad content (including image content itself) is blocked at submission time by type/size/text rules only; there's no report/approve/reject workflow for an admin yet.
- **No edit/delete UI** for your own posts or entries yet, even though the database policies already allow it (`auth.uid() = user_id` checks are in place) — it's a front-end addition, not a backend one.
- **Uploaded photos aren't deleted from Storage** if you later delete the row that referenced them (e.g. deleting a journal entry via SQL) — that's a small cleanup job (a Postgres trigger or a periodic Edge Function) worth adding once there's an edit/delete UI.
