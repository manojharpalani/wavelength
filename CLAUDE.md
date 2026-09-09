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

This is a Next.js 15 (App Router) app. It started as a rebuild of a
single-file static prototype where the whole product lived in one client
component (`app/page.tsx`) with an in-memory `view` state machine instead
of real routes; as of the 2026-09-09 redesign (see `docs/DECISIONS.md`)
it's a real route tree with shared modules under `lib/` and `components/`.
Two things stay outside the signed-in app on purpose — see the "wizard" and
"invite links" bullets below — everything else requires an account.

- **`app/page.tsx`** — the marketing home page only, signed-out visitors.
  A signed-in visitor is redirected to `/dashboard`. Also owns the whole
  `?join=CODE` invite-link flow (preview the team name via the
  anon-permitted `get_team_by_invite_code` RPC, prompt sign-in, auto-join
  and redirect once signed in) — that has to work signed-out, so it can't
  live behind the gated `/teams` route.
- **`app/manual/edit/page.tsx`** — the wizard. Deliberately *outside* the
  `app/(app)` route group and its auth gate: trying it before signing in
  has always worked, and this keeps that true. `step` is a `?step=<key>`
  query param instead of local state. Keeps its own left-rail chrome (the
  step list + a "Sign in to save your progress" link) rather than the
  shared `AppShell`.
- **`app/(app)/`** — a route group wrapping every signed-in screen in
  `AppShell` (`components/AppShell.tsx`: left nav — Dashboard / My Manual
  / Teams — collapsing to a drawer under 760px) via `app/(app)/layout.tsx`,
  which redirects to `/` if not signed in (or to `/manual/edit` if
  Supabase isn't configured at all — see below):
  - `dashboard/page.tsx` — the logged-in landing page: personal-manual
    completion card, and a card per team (member count, agreement-status
    pill) linking into that team or straight into its agreement.
  - `manual/page.tsx` — read-only "My Manual" profile view (avatar, name,
    role, MBTI, the manual body), with an "Edit basics" disclosure for
    name/role/MBTI and an "Edit full manual" link into the wizard.
  - `teams/page.tsx` — team list + create/join forms.
  - `teams/[teamId]/page.tsx` — invite link, the roster as a grid of
    profile cards, the agreement-status card, and rename/leave/delete
    under a "Team settings" disclosure.
  - `teams/[teamId]/members/[userId]/page.tsx` — a teammate's manual,
    read-only, as its own page (not a modal).
  - `teams/[teamId]/agreement/page.tsx` — the working agreement's three
    tabs; `tab` is a `?tab=<respond|compare|draft>` query param.
- **`lib/manual/data.ts`** — the personal-manual data model: `STEPS`
  (drives the wizard form), `REVIEW_GROUPS`/`ONEPAGER_*` (drives what
  shows up in the generated manual — kept manually in sync with `STEPS`),
  `SAMPLE_VALUES`, `manualCompletion()` (the dashboard's completion
  fraction), and helpers (`isFilled`, `deriveTags`, `docTitleFor`, …).
  Adding a wizard field means editing `STEPS` and usually a matching entry
  in `REVIEW_GROUPS`/`ONEPAGER_*`.
- **`lib/agreement/data.ts`** — `AGREEMENT_QUESTIONS`, `SAMPLE_AGREEMENT`,
  and status-summary helpers (`agreementStatusSummary` for the full-detail
  team page, `teamAgreementBadge` for the lightweight dashboard/team-card
  pill fed straight from `get_my_teams()`'s enriched columns). Adding an
  agreement question means editing `AGREEMENT_QUESTIONS` (and ideally
  `SAMPLE_AGREEMENT`) — `question_key` in the schema is free text, not a
  foreign key, so this needs no migration.
- **`lib/teams/types.ts`** — `TeamSummary`/`RosterRow`, matching
  `get_my_teams()`/`get_team_roster()`'s current return shape exactly;
  update both together when either RPC's columns change.
- **`lib/auth/AuthProvider.tsx`** — mounted once in `app/layout.tsx`, wraps
  the whole app. Owns `authUser`/`authLoading`/`supabaseEnabled` and the
  sign-in modal's open state; every route reads it via `useAuth()` instead
  of prop-drilling. `components/SignInModal.tsx` is the magic-link form
  itself, mounted once inside the provider.
- **`lib/hooks/`** — one small hook per concern, each a plain
  `useEffect`/`useState` wrapper around Supabase calls (no state-management
  library): `useMyManual` (load/autosave/flush-on-hide — used by both the
  wizard and the read-only manual view), `useMyTeams` (list +
  create/join), `useTeamRoster`, `useTeamActions` (rename/leave/delete),
  `useTeamMemberManual`, and `useAgreement` (everything the agreement's
  three tabs need: load, per-question autosave, AI synthesis, finalize).
- **`components/`** — `ManualBody`/`ReviewSection` (the manual/agreement
  renderer, shared by the wizard's review step, My Manual, a teammate's
  profile, and the agreement's print view), `MbtiBadge`, `Avatar`
  (generated initials-on-hashed-color, no photo upload — see
  `docs/DECISIONS.md`, 2026-09-09), `AssistButton`, `LogoMark`,
  `HomeVideoEmbed`, `AppShell`, `SignInModal`.
- **`app/globals.css`** — all styling, including a `@media print` block
  that is the *only* styling used when the user clicks "Print / Save as
  PDF" (`window.print()`) — reused for a personal manual and a finalized
  team agreement. Print output gets its own letterhead (`.print-letterhead`,
  `.print-footer`) that's `display: none` on screen and only shown in
  print — check this block (including the `.app-shell-*` print rules) when
  changing what the exported PDF looks like, not the screen styles. Note:
  `.home` uses `justify-content: safe center`, not plain `center` — plain
  `center` on an overflowing flex container clips its top permanently
  instead of letting you scroll to it (see `docs/DECISIONS.md`,
  2026-09-04); don't revert that without re-reading why.
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
- **`lib/supabase/{client,server,config}.ts`, `middleware.ts`,
  `app/auth/callback/route.ts`** — optional accounts + persistence.
  `config.ts`'s `isSupabaseConfigured()` gates everything: with
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset, the
  browser/server clients return `null`, `AuthProvider` never sets
  `authUser`, and `app/(app)/layout.tsx` redirects every signed-in route to
  `/manual/edit` — the app must keep working exactly as before when these
  are unset (just the wizard, nothing saved). `client.ts` is the browser
  client (magic-link sign-in, session state, autosave); `server.ts` is for
  Route Handlers; `middleware.ts` refreshes the auth cookie on every
  request; `app/auth/callback/route.ts` exchanges the magic-link code for
  a session. See `docs/DECISIONS.md` (2026-09-04) for the reasoning and
  `supabase/migrations/20260828120000_accounts_and_manuals.sql` for the DB
  schema + RLS policies — see "Database migrations" below for how
  migrations get applied.
- **`app/join/[code]/page.tsx`, `supabase/migrations/20260904160000_teams.sql`,
  `supabase/migrations/20260905220000_team_management.sql`,
  `supabase/migrations/20260909120000_team_summary_counts.sql`,
  `supabase/migrations/20260909120100_roster_role.sql`** — teams, gated by
  the same `isSupabaseConfigured()` check. Team create/join/roster/rename/
  leave/delete all go through `security definer` RPCs, not direct table
  access — `teams`/`team_members` have RLS enabled with no row policies at
  all; see `docs/DECISIONS.md` (2026-09-04, "Teams (Phase 2)" and "Team
  management") for why. `/join/[code]` is a thin server-component redirect
  to `/?join=CODE`, handled entirely on the marketing home page (see
  above) rather than the gated `/teams` route. The two 2026-09-09
  migrations enrich `get_my_teams()`/`get_team_roster()` (member count,
  agreement status, role) so the dashboard and profile cards don't need
  N+1 RPC round trips — same drop-then-recreate pattern as
  `20260908130000_roster_mbti.sql`.
- **`supabase/migrations/20260905220100_manual_sharing.sql`** — one RPC,
  `get_team_member_manual`, letting a team member read (never write) a
  teammate's `personal_manuals` row, gated on both people being members of
  the same team. Does not add a row policy to `personal_manuals` itself —
  see `docs/DECISIONS.md` (2026-09-04).
- **`supabase/migrations/20260905000000_team_working_agreement.sql`,
  `lib/agreement/data.ts`'s `AGREEMENT_QUESTIONS`, `/api/assist`'s
  `team-synthesis` mode** — the Team Working Agreement (Phase 3). Same RLS
  pattern as Phase 2: `team_agreement_responses`/`team_agreement_drafts`/
  `team_agreements` have no row policies, everything goes through
  `security definer` RPCs that check `team_members` first. Once finalized
  (`team_agreements.finalized_at` set), the UI renders the agreement
  read-only — the draft textareas aren't shown at all until someone clicks
  "Edit agreement"; `save_agreement_draft` still auto-clears
  `finalized_at` on any write as defense-in-depth, but the UI shouldn't
  normally reach that path while finalized. See `docs/DECISIONS.md`
  (2026-09-04, "Team Working Agreement (Phase 3)" and the read-only-
  finalize entry above it) for the full reasoning.

### Database migrations

The schema lives in `supabase/migrations/` as ordinary, timestamp-ordered
Supabase CLI migration files — applied with `npx supabase db push`, not by
pasting SQL into the dashboard's SQL Editor. One-time setup (`supabase
login` + `supabase link --project-ref <ref>`) and the day-to-day
`db push` workflow are documented in the README's "Database migrations"
section — that's the version to point a person at; don't duplicate the
exact commands here. `supabase link`/`login` needs interactive auth
(a browser, a database password) and should always be run by the project
owner in their own terminal, never scripted or entered on someone's
behalf.

Every migration file is written to be safe to re-run (`create table if not
exists`, `create or replace function`, `drop function if exists` first
where a signature changes) — necessary because `db push` will replay all
of them the first time it's linked to a project that already has this
schema from being pasted in by hand, and harmless if it's replayed again
later.

Add a new migration as a new file named
`<YYYYMMDDHHmmss>_<short_description>.sql` (later timestamp than every
existing file) — never edit an already-applied migration file in place,
since `db push` only looks at what's new.

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
