# Jo, Actually.

A private, single-user tracker. Phase 1, Stage 1: ratings, history, settings, light/dark mode.

- **App:** React + Vite (TypeScript), plain CSS
- **Data and login:** Supabase, London region, row-level security on every table, public sign-up off
- **Hosting:** Netlify (`netlify.toml`)

## Set-up

1. In Supabase → SQL Editor, run `supabase/schema.sql` once on a fresh project.
2. Copy `.env.example` to `.env.local` and fill in the project URL and **publishable** key.
   On Netlify, add the same two variables under Site configuration → Environment variables.
3. `npm install`, then `npm run dev`.

Never put the Supabase secret / service_role key anywhere in this repo.
