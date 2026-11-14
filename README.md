# Jo, Actually.

A private, single-user tracker. Phase 1: ratings, medication, meals, sleep, history, settings, light/dark mode, CSV export.

- **App:** React + Vite (TypeScript), plain CSS
- **Data and login:** Supabase, London region, row-level security on every table, public sign-up off
- **Hosting:** Vercel (`vercel.json`)

## Set-up

1. In Supabase → SQL Editor, run `supabase/schema.sql` once on a fresh project, then `supabase/002_stage2.sql`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key.
   On Vercel, add the same two variables under Project → Settings → Environment Variables.
3. `npm install`, then `npm run dev`.

Never put the Supabase secret / service_role key anywhere in this repo.

## Build log

- **14 Nov 2026:** Stage 1 finished and checked on Jo's phone.
- **14 Nov 2026:** Jo chose to start Stage 2 straight away instead of after two weeks of use, so she can test every feature during that fortnight. The "fix annoyances first" list will cover Stage 2 screens as well.
