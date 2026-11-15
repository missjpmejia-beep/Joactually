# Jo, Actually. — project notes for Claude

Read this first. It replaces re-reading the original build conversation.

## What this is
A private, single-user health tracker for Jo (mood, anxiety, energy, symptoms, medication, meals, sleep, naps). Live at **https://www.joactually.co.uk** (the bare domain redirects to www). Jo uses it daily on an Android phone (installed to home screen) and sometimes as a desktop app.

**Status:** Phase 1 (Stages 1 and 2 of the original spec) is complete and checked on Jo's phone, plus extras built since (below). Jo chose to skip the spec's "two weeks of use before Stage 2" gate. **Stage 3 (charts) has not started.** Patterns is a placeholder.

## Working with Jo
- Jo is **not a developer**. Explain choices briefly in plain English, UK spelling and terms.
- Jo has ADHD: short, structured replies; one setup step at a time; recommend rather than list every option.
- Warm, direct, a bit playful. No lectures, no excessive praise.
- **Ask before changing the spec, the data model or anything outward-facing.** Raise problems rather than quietly working around them.
- "If Jo has to ask what something means, it's a bug." Prefer wording that explains itself.
- Be honest about mistakes (e.g. say if something was published before it was meant to be).
- Health data: never put Jo's real entries, medication names or personal details anywhere outside the app (commits, docs, test fixtures).

## Stack and services
| Part | What | Notes |
|---|---|---|
| App | React 19 + Vite + TypeScript, plain CSS | `npm run build` (runs `tsc -b` then Vite). No test runner in the repo. |
| Data + login | Supabase, London (eu-west-2), project ref `kdxxaeoqqukwqelocrqq` | Public sign-up **off**. Jo's account created by hand. |
| Hosting | **Vercel** (Netlify account was suspended on day one) | Auto-deploys on push. `vercel.json` has SPA rewrite + security headers. |
| Domain | joactually.co.uk at **Fasthosts** | A `@` → 216.198.79.1, CNAME `www` → Vercel. |
| Code | GitHub `missjpmejia-beep/Joactually` | Everything so far is on branch `claude/youthful-planck-5hkqu0`, which is also what Vercel deploys. There is no `main` yet; tidying that is on the to-do list. Ask before pushing anywhere else. |

Environment variables (Vercel, Production + Preview, and `.env.local` locally, never committed): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The publishable key is safe in the front end. **Never** use or ask for the secret / service_role key.

## Non-negotiables (from the spec)
Row-level security on every table · public sign-up off · HTTPS only · no secret keys in code · no third-party analytics, trackers or ads · no AI calls · fonts self-hosted (no Google Fonts requests) · CSV export available · observations, never conclusions · missing is not zero.

## Data model
Two tables, both with RLS (`user_id = auth.uid()` for select/insert/update/delete; logged-out role has no access).

**`tracked_items`**: name, `type` (rating | event | period), shown, sort_order, `direction` (higher_is_better | higher_is_worse), `label_low`, `label_2`, `label_3`, `label_4`, `label_high` (2–4 optional; agreed change from the spec), `allows_none` (symptoms get a "None" = 0), `is_medication`, `default_amount`, `default_unit`.

**`entries`**: item_id, `occurred_at` (UTC), `time_zone` (Europe/London), `value` (0–5, ratings), `description`/`amount`/`unit`/`size` (events), `status` taken/missed (medication only), `start_at`/`end_at`/`quality`/`interrupted`/`is_nap` (sleep), note, recorded_at, updated_at, `deleted_at` (soft delete; recoverable 30 days, then purged when Recently deleted is opened).

A trigger `check_entry()` enforces that each entry suits its item type. Sleep's `occurred_at` = `end_at` (date of waking). A sleep with `start_at` and no `end_at` is **in progress** (sleep timer); a partial unique index allows one open sleep per user. App queries exclude open sleeps from lists and CSV.

**Migrations Jo has run in the Supabase SQL editor, in order:** `supabase/schema.sql` → `supabase/002_stage2.sql` → `supabase/003_sleep_timer_and_naps.sql`. **Pending:** `supabase/004_journal.sql` (adds `type = 'journal'`; journal text lives in `entries.note`; inserts a Journal item for existing accounts). New schema changes go in a new numbered file. Jo pastes it in, so give her the GitHub link and wait for "success" **before** pushing code that depends on it.

Starter items: Mood, Anxiety, Energy (ratings), Sleep (period), Meal (event), Journal (journal). Created on first login by `seedStarterItems()` in `src/lib/data.ts`.

## Features built
- **Today:** hero Mood critter + rule-based speech bubble; critter tiles for ratings and events showing "Good · 10:12" (Jo's own scale word + time); Sleep card with **"Going to sleep" / "I'm awake"** timer (wake sheet guesses Nap vs Night's sleep: daytime start and under 4 h = nap); **Meds** grouped in one collapsible box (one tap logs the usual dose; Change/Undo after); "Today so far" list.
- **Journal** card on Today (below Meds): big text box, draft kept on the device if the sheet is closed. Never nudged in the speech bubble. Shows in History (first 4 lines) and is searchable.
- **Delete an item:** Settings → Edit → Delete. Unused items go straight away; items with entries need the name typed, and delete their entries for good (offers Hide instead). Sleep and Journal can only be hidden.
- Toast after every save: Undo, plus Add note (ratings) or Change (medication).
- **History:** every day shown including empty days ("Nothing logged. That's fine."), filter by item, search notes and descriptions, edit/delete any entry; mini critter per entry.
- **Settings:** one ordered list of all items (up/down, hide/show, edit), add rating/medication/event, appearance (light/dark/match device), My data (CSV export in UK time, Recently deleted, delete everything with typed confirmation), change password, sign out.
- Login with password reset (Supabase URL config: Site URL `https://www.joactually.co.uk`).
- App icon: the Mood critter (PNG set in `public/`, source `icon-src/icon.svg`).
- Test sheet of every critter at every score: `/critters`.

## Design system: "Riso Critters"
Jo's brief: risograph-zine look, blob "critters" whose faces mirror the latest score. Light **and** dark mode (Jo's call, matching the spec).
- `src/riso.css` holds everything: tokens (`--paper`, `--ink`, `--riso-pink/-blue/-yellow/-green/-orange`, `--sleep-lilac`), remaps the older tokens in `src/styles.css`, ink borders, hard offset shadows, dark-mode values. `class="riso"` is added to `<html>` in `src/main.tsx`.
- Fonts: Bagel Fat One (logo and display only) + Rubik Variable, self-hosted via `@fontsource`.
- `src/components/Critter.tsx`: one `<Critter type score logged size face?>`. All expressions are in the `FACES` table plus food/meds faces (food logged = 😋 tongue, meds logged = sunglasses, sleeping = peaceful). The second ink prints **underneath** the first, offset, so dark mode stays clean.
- `src/lib/critters.ts`: which critter an item gets (by name for Mood/Anxiety/Energy, otherwise by direction), speech-bubble rules (never comment on scores), entry and settings critters.
- Copy rules: playful, never guilt-trippy, no judgements about scores.

## Key files
`src/pages/Today.tsx` · `History.tsx` · `Settings.tsx` · `MyData.tsx` · `Patterns.tsx` (placeholder) · `Login.tsx` · `src/components/` (Sheet, RatingOptions, EntryList, EntryEditor, EventSheet, SleepSheet, NoteSheet, Critter) · `src/lib/data.ts` (every Supabase call) · `src/lib/time.ts` (UK time + BST maths; store UTC, show London) · `src/lib/types.ts` · `src/lib/csv.ts`.

## How things were tested
- A **throwaway test account** exists in Supabase (Jo is keeping it for testing). Ask Jo for its login; never store it in the repo. **Delete it before anyone else ever uses the app.**
- Playwright (pre-installed in the cloud sandbox) driving a phone-sized browser against the live site or `npx vite preview`, logged in as the test account, with screenshots checked in light and dark before publishing.
- RLS checked by logging in as the test account and confirming 0 of Jo's rows are visible or changeable.
- Node needs `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` to reach Supabase from the sandbox.
- Lessons: wait for animations before screenshotting; check phone width with long real-world text (long medication names, long notes).

## Open items / ideas
- Stage 3 (Overview charts) needs its own short spec first. See the original spec's "Later stages".
- Create a proper `main` branch and point Vercel production at it (ask Jo first).
- Desktop layout is the least polished part (tall empty sidebar).
- Custom ratings borrow the Mood or Anxiety critter, so several can look alike. Could get their own colours.
- Before any public launch: privacy notice, DPIA, MHRA software check (health data is special category under UK GDPR).
