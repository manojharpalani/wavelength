# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # install deps
npm run dev               # dev server at http://localhost:3000
npm run build              # production build (also runs typecheck + lint)
npm run lint               # eslint
npx tsc --noEmit           # typecheck only, no build
```

There is no test suite yet.

Deploying (project is already linked via `.vercel/`):

```bash
vercel            # preview deployment
vercel --prod     # promote to production (confirm with the user first)
```

Env vars: `ANTHROPIC_API_KEY` powers the AI assist feature. Set locally in
`.env.local` (copy `.env.local.example`); for Vercel, use
`vercel env add ANTHROPIC_API_KEY <production|preview>` and paste the key
when prompted interactively — never pass a key as a command argument or
commit it, so it doesn't land in shell history or git.

## Architecture

This is a Next.js 15 (App Router) rebuild of a single-file static prototype
(originally a Claude Design canvas export). The whole product still lives as
one client component:

- **`app/page.tsx`** — the entire wizard + teams app: data model (`STEPS`,
  `REVIEW_GROUPS`, `ONEPAGER_*`, `SAMPLE_VALUES`, `AGREEMENT_QUESTIONS`,
  `SAMPLE_AGREEMENT`), all state (`view`, `step`, `values`, `exportView`,
  `previewOpen`, `assist`, plus the team/agreement state below), and every
  UI section (home landing page, wizard sidebar/steps, review/manual
  output, sample preview modal, team list/detail, the working agreement's
  three tabs). There's no router beyond `/` — "pages" are just `view`/
  `step` state, not Next.js routes. Adding a wizard field means editing the
  `STEPS` array (drives the form) and usually a matching entry in
  `REVIEW_GROUPS`/`ONEPAGER_*` (drives what shows up in the generated
  manual) — these are separate data structures kept manually in sync.
  Adding an agreement question means editing `AGREEMENT_QUESTIONS` (and
  ideally `SAMPLE_AGREEMENT`) — `question_key` in the schema is free text,
  not a foreign key, so this needs no migration.
- **`app/globals.css`** — all styling, including a `@media print` block that
  is the *only* styling used when the user clicks "Print / Save as PDF"
  (`window.print()` in `page.tsx`) — reused for both a personal manual and
  a finalized team agreement. Print output gets its own letterhead
  (`.print-letterhead`, `.print-footer`) that's `display: none` on screen
  and only shown in print — check this block when changing what the
  exported PDF looks like, not the screen styles. Note: `.home` uses
  `justify-content: safe center`, not plain `center` — plain `center` on
  an overflowing flex container clips its top permanently instead of
  letting you scroll to it (see `docs/DECISIONS.md`, 2026-09-04); don't
  revert that without re-reading why.
- **`app/api/assist/route.ts`** — the one server-side piece, two modes:
  the default takes a field label + the user's rough draft + light context
  (name/role) and returns a polished first-person rewrite; `{ mode:
  "team-synthesis", question, answers, currentDraft }` takes a working-
  agreement question and every member's answer and returns one proposed
  team-wide answer. Both call Claude via the Vercel AI SDK (`generateText`
  + `@ai-sdk/anthropic`) and both return 501 with a friendly message
  (rendered inline in the UI, not thrown) when `ANTHROPIC_API_KEY` is
  unset — preserve that graceful-degradation behavior rather than erroring
  the page.
- **Audio widget** (`AudioToggle` in `page.tsx`) — loads the YouTube iframe
  API imperatively (script tag + `window.onYouTubeIframeAPIReady`) and
  plays a hidden, off-screen video for background audio only. The video ID
  is hardcoded (`fIgfO9gD5GY`); swap it there to change the track.
- **`lib/supabase/{client,server,config}.ts`, `middleware.ts`,
  `app/auth/callback/route.ts`** — optional accounts + persistence.
  `config.ts`'s `isSupabaseConfigured()` gates everything: with
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset, the
  browser/server clients return `null` and every call site (in `page.tsx`,
  the middleware, the callback route) no-ops instead of throwing — the app
  must keep working exactly as before when these are unset. `client.ts` is
  the browser client (magic-link sign-in, session state, autosave);
  `server.ts` is for Route Handlers; `middleware.ts` refreshes the auth
  cookie on every request; `app/auth/callback/route.ts` exchanges the
  magic-link code for a session. See `docs/DECISIONS.md` (2026-09-04) for
  the reasoning and `supabase/schema.sql` for the DB schema + RLS
  policies — run that file in the Supabase SQL Editor once per project.
- **`app/join/[code]/page.tsx`, `supabase/schema_phase2.sql`,
  `supabase/schema_team_management.sql`** — teams, gated by the same
  `isSupabaseConfigured()` check. Team create/join/roster/rename/leave/
  delete all go through `security definer` RPCs, not direct table access —
  `teams`/`team_members` have RLS enabled with no row policies at all; see
  `docs/DECISIONS.md` (2026-09-04, "Teams (Phase 2)" and "Team management")
  for why. `/join/[code]` is a thin server-component redirect to
  `/?join=CODE` — the actual join UI lives in `page.tsx` alongside
  everything else, there's no separate router. Run
  `supabase/schema_phase2.sql` then `supabase/schema_team_management.sql`
  once, after `schema.sql`.
- **`supabase/schema_manual_sharing.sql`** — one RPC,
  `get_team_member_manual`, letting a team member read (never write) a
  teammate's `personal_manuals` row, gated on both people being members of
  the same team. Does not add a row policy to `personal_manuals` itself —
  see `docs/DECISIONS.md` (2026-09-04). Run once, after `schema_phase2.sql`.
- **`supabase/schema_phase3.sql`, `AGREEMENT_QUESTIONS` in `page.tsx`,
  `/api/assist`'s `team-synthesis` mode** — the Team Working Agreement
  (Phase 3). Same RLS pattern as Phase 2:
  `team_agreement_responses`/`team_agreement_drafts`/`team_agreements`
  have no row policies, everything goes through `security definer` RPCs
  that check `team_members` first. Once finalized (`team_agreements.
  finalized_at` set), the UI renders the agreement read-only — the draft
  textareas aren't shown at all until someone clicks "Edit agreement";
  `save_agreement_draft` still auto-clears `finalized_at` on any write as
  defense-in-depth, but the UI shouldn't normally reach that path while
  finalized. See `docs/DECISIONS.md` (2026-09-04, "Team Working Agreement
  (Phase 3)" and the read-only-finalize entry above it) for the full
  reasoning. Run `supabase/schema_phase3.sql` once, after `schema.sql` and
  `schema_phase2.sql`.

### Schema run order

`schema.sql` → `schema_phase2.sql` → `schema_phase3.sql` →
`schema_team_management.sql` → `schema_manual_sharing.sql`. Each is safe to
re-run.

### Testing a schema change: run it against real Postgres, not just mocked client state

Every `plpgsql` function in these files that checks team membership does it
with `select 1 from team_members tm_check where tm_check.team_id = ... and
tm_check.user_id = ...` — aliased and column-qualified on purpose. An
unqualified `team_id`/`user_id` there is only a problem once some function's
`returns table (...)` happens to declare an OUT parameter with the same
name (plpgsql's default `#variable_conflict = error` makes that ambiguous
and the call fails) — which is exactly what happened to
`get_team_agreement_responses` and `get_team_roster` for the entirety of
Phase 2 and Phase 3, undetected, because every round of testing in this
project mocked the *client's* React state to check rendering rather than
ever executing these functions against a real database. Keep aliasing this
pattern in any new function, and before considering a schema change done,
actually run it: spin up local Postgres (`service postgresql start` in this
sandbox), stub `auth.uid()`/`auth.users`/the `anon`/`authenticated` roles,
replay the schema files in order, and call the new or changed function as
two different users with real rows — not just a syntax check. See
`docs/DECISIONS.md` (2026-09-05) for what this caught.

### Vercel project quirk

The Vercel project (`soul-map-ai/wavelength`) was originally created for a
plain static site, so its dashboard framework setting doesn't auto-detect
Next.js. `vercel.json` pins `"framework": "nextjs"` to override that — don't
remove it or builds will fail with "No Output Directory named public".

## Documentation to keep in sync

When you make a change, update the relevant doc(s) in the same commit:

- **`CHANGELOG.md`** — every user-facing or deploy-worthy change gets an
  entry (Keep a Changelog style), added when the change is made, not
  batched later.
- **`docs/DECISIONS.md`** — append an entry for any non-obvious technical or
  product choice (a library pick, an architecture change, a tradeoff) with
  the reasoning, so the "why" isn't lost.
- **`docs/REQUIREMENTS.md`** — update when the product's intended behavior
  or scope changes (new feature, changed flow, new constraint).
