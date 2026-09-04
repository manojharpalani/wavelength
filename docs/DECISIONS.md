# Key Decisions

A running log of non-obvious technical and product choices, with the
reasoning, so the "why" survives past whoever made the call. Append new
entries at the top; don't rewrite history — if a decision gets reversed,
add a new entry that supersedes it and note what changed.

## 2026-09-04 — Fixed: `.home`'s flex centering silently clipped the top of any tall view

**Decision:** Changed `.home { justify-content: center; }` to
`justify-content: safe center` in `app/globals.css`.

**Why:** Found while screenshot-verifying the finalized Team Working
Agreement view, which is taller than a typical viewport. The page's top
(nav, heading, tabs) was permanently unreachable no matter how far down
the container was scrolled — `scrollTop` read `0` at every ancestor, yet
`getBoundingClientRect()` showed the nav rendering ~445px *above* the
viewport. Root cause: `.home` is a flex column with `overflow-y: auto` and
`justify-content: center`; when a flex container's content overflows its
box, `center` clips symmetrically from both ends rather than falling back
to start-alignment, and there's no scroll position that reveals content
clipped off the top. This predates this session — any sufficiently tall
`.home` view would have hit it — but nothing had been tall enough to
trigger it visibly until the finalized agreement view. `safe center` is
the CSS Box Alignment spec's fallback keyword: centers when content fits,
but falls back to start-alignment (nothing clipped, fully scrollable) once
it overflows. Verified via `getBoundingClientRect()` (nav now renders at
the correct top offset) and a full top-to-bottom screenshot of the
finalized agreement view.

## 2026-09-04 — Reversed: finalizing the Team Working Agreement makes it read-only (supersedes "editing reopens automatically")

**Decision:** Once a Team Working Agreement is finalized, the draft
textareas are no longer rendered at all — the view shows each answer as
plain read-only text, a "Print / Save as PDF" button, and an explicit
"Edit agreement" button that's the only way back into edit mode. This
replaces the original Phase 3 design, where the draft stayed editable
after finalizing and any keystroke silently cleared `finalized_at`.

**Why:** Flagged during this session's audit as a concrete way the feature
was half-baked. The original behavior had no confirmation and often no
visible sign anything had changed — someone opening a finalized agreement
just to read it could click into a textarea while scrolling or selecting
text and silently un-finalize it for the whole team, with the only tell
being a "finalized" banner quietly disappearing. Read-only-until-you-say-
so is the behavior people actually expect from "finalized."

**Consequence:** `save_agreement_draft`'s auto-clear of `finalized_at`
(added in the original Phase 3 schema) is now defense-in-depth rather than
the primary mechanism — the UI never intentionally calls it while
finalized, since the draft form isn't editable in that state without
clicking "Edit agreement" first. Left in place rather than removed, in
case a client is ever in a stale state.

## 2026-09-04 — Teammates can view each other's completed personal manual

**Decision:** Added `get_team_member_manual(p_team_id, p_user_id)`, a
`security definer` RPC that returns another team member's manual `values`,
after checking both the caller and the target user are members of the
same team. See `supabase/schema_manual_sharing.sql`. Clicking a teammate
with a completed manual in the team roster opens it in a read-only modal,
reusing the same one-pager rendering as the personal wizard's review step.
This does **not** add or change any row-level policy on `personal_manuals`
itself — that table stays owner-only at the RLS layer; access to a
teammate's row is mediated entirely through this one function, same
pattern as every other team-scoped read.

**Why:** Also flagged during the audit — the roster already showed a
checkmark for "has completed their manual," which told you a manual
existed but not what it said, and had no path to actually read it. Given
manuals and teams are now the same product journey (build your manual,
then build your team's agreement), being unable to read a teammate's
manual from their team page was a real gap, not a missing nice-to-have.

**Scope:** read-only, no editing someone else's manual, and no
notification to the manual's owner when a teammate views it.

## 2026-09-04 — Team management: rename, leave, delete

**Decision:** Added three `security definer` RPCs in
`supabase/schema_team_management.sql`, same deny-by-default RLS pattern as
the rest of the team-scoped tables: `rename_team` (owner-only, via
`teams.created_by = auth.uid()`), `leave_team` (any member except the
owner — the owner gets an explicit error telling them to delete the team
instead), and `delete_team` (owner-only; relies on the existing `on delete
cascade` foreign keys from `schema_phase2.sql`/`schema_phase3.sql` to clean
up membership rows, agreement responses, drafts, and the finalized record).
The team detail page gained a rename-in-place control next to the team
name and a "danger zone" section at the bottom with a two-step inline
confirm for leave/delete.

**Why:** Another audit finding — a team, once created, had no way to fix a
typo'd name, leave a team you joined by mistake, or delete one that's no
longer needed. Every team was effectively permanent.

**Deferred:** ownership transfer. An owner who wants out currently has to
delete the whole team rather than hand it to someone else and leave — a
real limitation for anything but a small, informal team, called out in
`docs/REQUIREMENTS.md` under "Explicitly out of scope."

## 2026-09-04 — Reversed: add optional accounts + persistence via Supabase (supersedes "no backend" scoping)

**Decision:** Wavelength gets an *optional* backend — Supabase for auth
(passwordless magic-link email) and Postgres persistence of the personal
manual, keyed to the signed-in account. This directly reverses the
2026-08-24-era "no user accounts or backend persistence" scoping in
`docs/REQUIREMENTS.md` (that line itself dates from the original
Next.js rebuild decision below, not a separate standalone entry).

**Why:** Product direction is shifting from a purely individual tool
toward "working better together as a team" — a shared Team Working
Agreement that a team collaboratively builds, with each member's personal
manual optional-but-encouraged along the way (see
`docs/REQUIREMENTS.md` -> Roadmap). A collaborative, multi-person feature
is impossible without knowing who someone is across visits and persisting
their answers, so accounts are now a prerequisite rather than a
deliberately-excluded feature.

**Why Supabase specifically (vs. Clerk + separate Postgres, or Auth.js +
Vercel Postgres):** one service instead of two (auth + Postgres + storage
bundled), generous free tier, plays well with Vercel/Next.js, and RLS
(row-level security) maps cleanly onto "every user can only touch their
own row" without hand-rolling authorization checks in every route.

**Why magic-link, not passwords or social login:** no password to create,
remember, or leak; smallest amount of auth UI to build and maintain; fits
a product that's meant to feel low-friction and five-minutes-to-value.

**Why it stays fully optional:** the sign-in affordance is hidden
entirely (not shown-but-broken) when `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set, and the app works exactly as
it did before this change when signed out — same graceful-degradation
pattern already established for `ANTHROPIC_API_KEY`. Nobody is forced
into an account just to try the wizard.

**Handling the secrets:** `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are client-exposed by design (Supabase's
anon key is meant to be public; RLS is the actual access control) and are
set the same way as `ANTHROPIC_API_KEY` — `.env.local` locally (gitignored,
`.env.local.example` documents the names), `vercel env add <name> <env>`
for deploys, never typed into chat or passed as a shell argument. No
service-role (secret) key is used anywhere in this phase — RLS alone
authorizes every read/write, so there's no server-side secret to protect
yet.

**Scope of this change:** Phase 1 only — accounts + personal-manual
persistence. No team/invite/collaborative-agreement tables yet (Phases
2-3, see Roadmap); `supabase/schema.sql` has just the one table on
purpose and says so in a comment.

## 2026-09-04 — Teams (Phase 2): deny-by-default RLS + security-definer RPCs, not row policies

**Decision:** `teams` and `team_members` have RLS enabled but carry **no
row-level policies at all** — every read and write goes through one of five
`security definer` Postgres functions (`create_team`, `join_team_by_code`,
`get_my_teams`, `get_team_roster`, `get_team_by_invite_code`) instead of
direct PostgREST table access. See `supabase/schema_phase2.sql`.

**Why:** The invite-code join flow needs a signed-out visitor to preview a
team by code (so `/join/CODE` can say "You've been invited to join
<team>") before they've joined it or even signed in — that's an access
pattern ("can see this one row, identified by a secret-ish code, but
nothing else in the table") that's awkward to express as a row-level
`using` predicate without either leaking the whole `teams` table via the
anon key or writing a policy that's easy to get subtly wrong. A
`security definer` function scoped to exactly the columns and checks it
needs is easier to reason about and review than a matrix of policies, and
it means a leaked/misused anon key can't enumerate teams or memberships by
querying the tables directly — the tables are simply not reachable except
through these functions. `get_team_by_invite_code` is the only one granted
to the `anon` role (read-only, returns just `id`/`name`); the rest require
`authenticated`.

**Team joining via shareable link:** invite codes are short (8-char,
lowercase hex-ish, generated server-side from `gen_random_uuid()`) rather
than the raw team UUID, and are exposed at a nicer URL — `/join/CODE`,
a server component that immediately redirects to `/?join=CODE` — because
the single-page app owns the whole join UX (preview, sign-in prompt, join)
in `app/page.tsx` and there's no separate router beyond `/`. The code
survives the magic-link sign-in round trip via the existing `next` query
param on `/auth/callback` (already built for Phase 1), so "click invite
link while signed out → sign in → land back on the invite, now joinable"
works without extra state.

**Scope:** membership only — creating a team, joining it, seeing who's on
it and who's completed their personal manual. The Team Working Agreement
content itself (the actual "how should we work" questions and shared
draft) is Phase 3, not touched here.

## 2026-09-04 — Team Working Agreement (Phase 3): AI synthesis is a starting draft, not a decision

**Decision:** Any team member can ask Claude to turn everyone's individual
answers to a question into one proposed team-wide answer (`/api/assist`'s
new `team-synthesis` mode, reusing the same `ANTHROPIC_API_KEY` +
graceful-degradation setup as the personal manual's "Help me write this").
The result lands in the shared draft textarea, editable like anything
else — it's a starting point, not a final answer, and any member can
rewrite it by hand instead. There's no "auto-finalize" path; finalizing is
always a deliberate human action (see the read-only-finalize entry above).

**Why:** Synthesizing 3-8 short free-text answers into one coherent "we"
statement is exactly the kind of first-draft-from-messy-input task the
personal manual's assist feature already does well, and it saves the team
from someone having to manually read and reconcile everyone's answers
question by question. Making it optional (a button per question, not
automatic) and always-editable keeps the team in control of what actually
ends up in their agreement — the model doesn't get a vote, it drafts.

**Any member can edit and finalize, not just the team owner:** matches the
collaborative framing of the whole feature — a working agreement that only
one person can shape isn't really the team's agreement. The tradeoff is
lower guardrails (anyone can overwrite anyone else's draft edit), accepted
for v1 given team sizes are expected to be small; the RPCs still gate
everything on team membership, so it's a trust-your-teammates model, not
an open one.

**Schema:** same deny-by-default RLS + `security definer` RPC pattern as
Phase 2 (`teams`/`team_members`) — `team_agreement_responses`,
`team_agreement_drafts`, and `team_agreements` all have RLS enabled with
no row policies; every read/write is a function that checks
`team_members` membership first. See `supabase/schema_phase3.sql`.
`question_key` is free text, not a foreign key, so the question set
(defined in `app/page.tsx`'s `AGREEMENT_QUESTIONS`) can be edited without
a migration.

## 2026-08-24 — Direct Anthropic API key, not Vercel AI Gateway

**Decision:** AI assist calls Anthropic directly via `@ai-sdk/anthropic`
and `ANTHROPIC_API_KEY`, rather than routing through Vercel's AI Gateway.

**Why:** User's explicit preference when scoping the AI-native rebuild.
Gateway would avoid a separate provider key but adds an extra hop and ties
model routing to Vercel account billing; direct key is simpler for a
single-provider use case.

**Handling the secret:** the key is never typed into chat or passed as a
Bash argument — set locally in `.env.local` (gitignored) and on Vercel via
`vercel env add ANTHROPIC_API_KEY <env>`, which prompts for the value
interactively so it doesn't land in shell history or logs.

## 2026-08-24 — AI feature: per-field "draft assist," not chat intake or freeform import

**Decision:** The first AI-native feature is a "Help me write this" button
per long-answer field that polishes a rough note, rather than replacing the
wizard with a conversational chat intake or a "paste your bio, we'll fill
the form" importer.

**Why:** Smallest change that adds real value without redesigning the core
UX; keeps the user in control of and reviewing their own words per field,
which matters for a document that's meant to sound like *them*. Chat intake
and freeform import remain reasonable future options if this proves
valuable.

## 2026-08-24 — Rebuilt as Next.js 15 (App Router) instead of iterating on the static HTML file

**Decision:** The single-file static prototype (`index.html`, inline CSS/JS,
manual DOM string-building) was ported to Next.js 15 + React 19 + TS rather
than adding a server endpoint alongside the static file.

**Why:** The AI assist feature needs a server-side call (to keep the
Anthropic key off the client) — that requires a real backend, and Next.js's
App Router gives us that (`app/api/assist/route.ts`) plus React state
management in one deploy, instead of hand-rolling a second static + serverless
setup. The whole product still lives in one client component
(`app/page.tsx`) by design — see `CLAUDE.md` — it's a straight port of the
same render logic, not a ground-up redesign, to minimize risk of visual/UX
regressions.

**Consequence:** `vercel.json` needs `"framework": "nextjs"` because the
Vercel project was originally created for the static site and doesn't
auto-detect the framework switch — see the note in `CLAUDE.md`.

## 2026-08-24 — Print/PDF gets its own letterhead, not just cleaned-up screen styles

**Decision:** Added a dedicated `@media print` letterhead (logo + "Personal
Working Manual" + date, accent rule, uppercase section headings, footer)
instead of just hiding chrome and printing the on-screen review card as-is.

**Why:** User asked for the exported PDF to look "extremely professional" —
a document meant to be shared/printed warrants different typography and
branding conventions than an on-screen card UI (no borders/pills, print-safe
colors via `print-color-adjust: exact`, page-break-safe sections).

## 2026-08-24 — Vercel project name forced lowercase

**Decision:** Vercel project is `wavelength` (lowercase), not `Wavelength`
to match the local folder name.

**Why:** Vercel project names must be lowercase; the CLI rejected the
directory-derived default. No functional impact, just noting so the
mismatch between folder name and project slug isn't a surprise later.
