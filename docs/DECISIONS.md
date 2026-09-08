# Key Decisions

A running log of non-obvious technical and product choices, with the
reasoning, so the "why" survives past whoever made the call. Append new
entries at the top; don't rewrite history — if a decision gets reversed,
add a new entry that supersedes it and note what changed.

## 2026-09-08 — Fixed: the onboarding nudge silently hijacked invite-link sign-ins, so invited members never actually joined a team

**Bug:** the "About You" onboarding nudge added earlier the same day (see the entry below it) races with the existing `?join=CODE` invite-pickup effect. On mount, the invite effect synchronously sets `view` to `"teams"` so the invited person sees the "you've been invited" banner. The onboarding nudge, though, only resolves after two async round-trips (`auth.getUser()`, then a `personal_manuals` select) — so on a brand-new sign-in it always finishes *after* the invite effect and unconditionally calls `setView("wizard")`, overwriting `"teams"`. The invited person got swept into filling out their personal manual and never saw the join banner again; `join_team_by_code` never ran, so they never became a real `team_members` row — despite fully completing a manual. Confirmed against production data (with the account owner's explicit permission to query the linked Supabase project): two invited people had complete `personal_manuals` rows but zero `team_members` rows for the team they'd been invited to.

**Fix:** the onboarding-nudge effect now checks `window.location.search` for a `join` param immediately before redirecting, and skips the wizard redirect if one is present — letting the pending invite flow finish first. Reads the live URL rather than component state, so there's no equivalent stale-closure risk.

**Why this shape of fix:** the alternative (make the invite effect win by re-asserting `"teams"` after the nudge, e.g. with a ref/priority flag) would still leave two effects racing to set the same piece of state; checking intent before acting is simpler and removes the race outright. Confirmed that team-membership viewing itself (roster, teammate manuals via `get_team_member_manual`, and the shared agreement) was never owner-gated — every team member can already browse all of it; the reported symptom was entirely explained by the invited people never becoming members in the first place.

## 2026-09-08 — Video moved from a click-to-open modal to inline on the home page (supersedes the entry directly below)

**Decision:** The modal-based `VideoToggle` from earlier the same day (button in every "brand row" → opens a modal with the embed) was replaced with `HomeVideoEmbed` — a plain YouTube `<iframe>` sitting directly in the home page's layout, between the hero and "why it matters," always visible, nothing to click to reveal it. It no longer appears anywhere else (wizard, teams, agreement) — those nav rows are back to just the logo and wordmark. Autoplay is still off; a visitor presses the embed's own play control.

**Why:** asked directly to embed it "in the home page itself inline" rather than behind a button. Confining it to the home page also reads better with this session's earlier team-first pivot — a promotional/explainer video belongs on the landing page, not following a member into the wizard or their team's working agreement.

## 2026-09-08 — Hidden background-audio widget replaced with an on-demand, visible video

**Decision:** `AudioToggle` — which imperatively loaded the YouTube IFrame API and autoplayed a hidden, off-screen 2×2px video the instant the page loaded, for background music only — is gone. In its place, `VideoToggle` (same component, same nav slot everywhere the wordmark appears) opens a modal containing a plain, visible YouTube `<iframe>` embed for a new video (`HOME_VIDEO_ID`). Nothing loads or plays until a member clicks the button and then the video's own play control; there's no autoplay parameter and no imperative player API at all — a standard embed handles play/pause/fullscreen itself.

**Why:** asked directly — the previous widget played audio automatically on every page load without asking, which is what a "background audio" toggle by definition does; the ask was to make it an actual video the member opts into. Dropping the imperative IFrame-API/script-tag machinery in favor of a plain iframe is also a real simplification (no `window.onYouTubeIframeAPIReady`, no player ref, no `declare global` typing for `window.YT`) — the old approach only existed to get a *hidden, headless, autoplaying* audio track, which a click-to-open visible embed doesn't need.

**Reused instead of rebuilt:** the video modal reuses the existing `.preview-backdrop`/`.preview-modal` styling already used by the sample-preview and auth modals, rather than introducing new modal chrome.

## 2026-09-08 — Myers-Briggs becomes a dropdown with a link to the free test; type shown as a badge, not our own artwork

**Decision:** The "About You" Myers-Briggs field changed from free text to a `select` dropdown of the 16 types (value = the 4-letter code; the visible option text adds the type's common nickname, e.g. "INTJ — Architect"), with a "Don't know yours? Take the free test" link to `https://www.16personalities.com/free-personality-test` shown underneath. Once set, the type renders as a small badge (`MbtiBadge` in `app/page.tsx`) — an in-house pill with a generic icon, the code, and (in its full variant) the nickname — linking out to `https://www.16personalities.com/<code>-personality`. The badge appears in the "Personality" section of the detailed manual (self view and the read-only teammate-manual view, since both share `ManualBody`) and, in a compact code-only variant, next to a member's name on the team roster.

**Why:** asked directly to make the field a dropdown linking to a free test, and to let teammates see an icon + link to the type once someone's picked one. 16personalities.com was already the site implicitly assumed by the old placeholder text and by the original "no in-app quiz" decision (see the "Optional Myers-Briggs field" entry below) — it's free, requires no signup, and is the standard alternative to the official paid instrument, so it's reused rather than reconsidered. The badge is deliberately **our own visual, not theirs**: reusing 16personalities' actual iconography/branding would repeat the same licensing concern that ruled out an in-app quiz in the first place, so the badge is a plain accent-colored chip built from scratch, with only the type code, nickname, and outbound link sourced from them.

**Roster support required a new migration:** `get_team_roster` (`supabase/migrations/20260908130000_roster_mbti.sql`) gained an `mbti_type` column, left-joining `personal_manuals` for `values->>'mbtiType'` — the same field the wizard already wrote, no new storage. Tested against local Postgres (a member with a type set, one without) before `db push`, per the existing migration-testing convention.

**Legacy free-text values:** a small number of existing rows may hold whatever a person previously typed into the old free-text field. A `<select>` bound to a value that doesn't match one of the 16 known codes just renders with nothing visibly selected — accepted as-is rather than building a "custom/other" escape hatch for a low-stakes, self-reported field; picking again from the dropdown fixes it.

## 2026-09-08 — Team-first pivot: onboarding nudge (not a gate), names reuse the wizard's own field, brand pass stays copy + Next.js-native metadata

**Decision (onboarding):** Every member still signs in through the same single-field, passwordless magic-link form (`renderAuthModal` in `app/page.tsx`) — no separate name field was added there, and no `profiles` table or `auth.users` metadata was introduced. Instead, the existing sign-in-load effect now checks whether the just-loaded `personal_manuals.values` came back empty and, if so, calls `setView("wizard")` once per sign-in (tracked via a ref, reset on sign-out) — landing the member on the wizard's "About You" step, whose first field is "Your name." This is a nudge, not a hard gate: the nav stays reachable, and no view or action anywhere is blocked on having a name or a completed manual.

**Why:** asked directly to have "each member who signs up provide their name and profile," but also decided (when scoping) that this should be a nudge rather than a hard requirement, matching the existing "optional, but encouraged" philosophy already documented for the personal manual. Reusing the wizard's own name field avoids a second, redundant place to type a name and any sync problem between the two; a brand-new `auth.users` row and a returning member who never finished onboarding are handled identically (both just have an empty manual), so no separate "is this a new signup" detection was needed either.

**Decision (names in team views):** `get_team_roster`, `get_team_agreement_responses`, and `get_agreement_status` (`supabase/migrations/20260908120000_member_names.sql`) each gained a `name`/`finalized_by_name` column, left-joining `personal_manuals` and reading `values->>'name'` — the same field the wizard writes, nothing new. The UI shows that name and falls back to email when a member hasn't reached the "About You" step yet (`app/page.tsx`, the roster row, the "Everyone's answers" compare view, the assemble-with-AI ownership note, and the finalized-agreement byline). `personal_manuals`'s own RLS is unchanged — these are pre-existing `security definer` RPCs that already read that table (the roster already joined it for `has_manual`). Tested against real local Postgres (two seeded users, one with a name, one without, plus a non-member) before `db push`, per the existing migration-testing convention — see the 2026-09-05 entry below.

**Decision (brand pass):** Scoped to copy plus the two pieces of brand metadata that were completely missing (`app/layout.tsx` had no favicon/OG/Twitter metadata at all, and there was no `public/` directory or logo file anywhere in the repo) — not a new visual identity. `app/icon.tsx` and `app/opengraph-image.tsx` use Next.js's file-based metadata conventions (`next/og`'s `ImageResponse`) to render the same inline squiggle path already used as `LogoMark` in `app/page.tsx`, so there's no new binary asset to design, store, or keep in sync — if `LogoMark`'s path ever changes, these two files need the same edit. Chosen directly when scoping, over also redesigning the mark itself (flagged as a separate, deliberate follow-up if wanted later, better suited to visual design tooling than a code-focused pass).

**Home page copy:** hero, CTA order (primary now opens Teams, personal manual moved to the secondary button), the "why it matters" cards, and the sample-preview dialog's default/pill order (Team agreement first) were all rewritten/reordered in `app/page.tsx` to lead with the team working agreement, with the personal manual framed as each member's on-ramp into it — matching the same reframing in `README.md` and `docs/REQUIREMENTS.md`'s Purpose/Core flow sections.

## 2026-09-05 — Schema files moved into `supabase/migrations/`, applied via the Supabase CLI

**Decision:** The five loose `supabase/schema*.sql` files (each meant to be pasted into the dashboard's SQL Editor by hand, in a documented order) are now Supabase CLI migrations under `supabase/migrations/`, named `<timestamp>_<description>.sql` in the same order they were always meant to run: `20260828120000_accounts_and_manuals.sql`, `20260904160000_teams.sql`, `20260905000000_team_working_agreement.sql`, `20260905220000_team_management.sql`, `20260905220100_manual_sharing.sql`. Applying them (first time or after a new one's added) is one command, `npx supabase db push`, after a one-time `supabase login` + `supabase link --project-ref <ref>` — both documented in the README.

**Why:** asked directly — copy-pasting SQL into a web UI, in the right order, every time the schema changed, was manual and easy to get wrong (skip a file, paste one twice, paste them out of order). The Supabase CLI's migration model is the standard tool for exactly this, and this project already had everything migrations need: every file was already written to be idempotent (`create table if not exists`, `create or replace function`), which is what makes the very first `db push` safe to run against a project whose schema so far only exists because someone pasted these same files in by hand.

**What this deliberately doesn't automate:** `supabase login` (browser OAuth) and `supabase link` (can prompt for the database password) still require a person, in their own terminal — on purpose. Handling a database password, or driving a browser-based auth flow on someone's behalf, isn't something to do from an assistant session even when technically possible; that's real credential handling, not "run this idempotent SQL file." Everything downstream of that one-time link (every future `db push`) needs no credential either — it reuses the CLI's saved session.

**Naming convention:** new schema work is a new file in `supabase/migrations/`, timestamped later than every existing one — never an edit to an already-applied migration, since `db push` only replays files it hasn't seen recorded as applied yet.

## 2026-09-05 — Owner-gated "Assemble with AI," but per-question editing stays open to everyone

**Decision:** Added one new capability — a single button that runs the existing per-question AI synthesis for every question with at least one teammate's answer, in sequence, so the whole draft gets assembled in one action instead of clicking "Draft from N answers" eight times. This button is shown only to the team owner (`activeTeam.is_owner`); everyone else sees an explanatory message naming the owner instead. Nothing else changed: any team member can still draft, edit, or overwrite any individual question's draft text by hand or via its own "Draft from N answers" button, and `save_agreement_draft` still accepts writes from any member, exactly as decided in the original Phase 3 entry below ("any member can edit and finalize").

**Why owner-gated only for this one action:** the request that prompted this was specifically framed as something the team owner does — a single person pulling everything together into one pass, which is a heavier, more consequential action (it can overwrite several questions' drafts at once) than editing one field. Restricting just this convenience button to the owner, while leaving per-question editing collaborative, gets the "owner assembles the manual" workflow without walking back the deliberate small-team, trust-your-teammates editing model already in place. The gate is UI-only — `save_agreement_draft` isn't changed to check ownership, so a non-owner who scripted the same sequence of calls could still do it; that's consistent with the existing trust model, not a new hole.

**Confirms before overwriting:** if any question already has draft text, clicking the button shows an inline "this will overwrite the current draft for every question with teammate answers" confirmation before running, matching the two-step inline-confirm pattern already used for leave/delete team.

## 2026-09-05 — Explicit save confirmation for "Your answers," not just silent autosave

**Decision:** Added a per-question "Saving… / Saved ✓ / Couldn't save — try again" status next to each question's label on the "Your answers" tab, and a "Save my answers" button at the bottom that immediately flushes every question's answer to the database (bypassing the 900ms debounce) and updates every status indicator right away. The debounced autosave itself is unchanged.

**Why:** flagged directly — there was no way to tell whether an answer had actually been recorded, especially important here since these answers feed a shared, multi-person view (unlike, say, the personal manual's autosave, where only the one person who wrote it will ever check). Silent-until-something-goes-wrong autosave is a reasonable default for a private document; a collaborative one benefits from visible confirmation. The personal manual's own autosave (Phase 1) still has no equivalent indicator — a reasonable next candidate for the same treatment, not done here to keep this change scoped to what was asked.

## 2026-09-05 — Fixed: ambiguous `user_id` broke "Everyone's answers" and the team roster in every real deployment

**Decision:** `get_team_agreement_responses` and `get_team_roster` (both `language plpgsql`) each had a membership check shaped like `if not exists (select 1 from team_members where team_id = p_team_id and user_id = auth.uid())`. Both functions also declare a `user_id` column in their `returns table (...)` — and under plpgsql's default `#variable_conflict = error`, an unqualified column reference that matches a declared OUT parameter name is a hard error, not a silent shadow. So every real call to either function raised `column reference "user_id" is ambiguous` — caught in the app only as a console-logged error, with the UI falling back to its normal empty state ("No one's answered this yet", an empty roster). Fixed by aliasing the membership-check subquery (`team_members tm_check`) and qualifying both columns, in every function across `schema_phase2.sql`, `schema_phase3.sql`, `schema_manual_sharing.sql`, and `schema_team_management.sql` that has the same shape — including three functions (`submit_agreement_response`, `save_agreement_draft`, `set_agreement_finalized`, the `leave_team`/`delete_team` pair) that return `void` and so couldn't actually hit this bug today, aliased anyway so the pattern can't quietly break again the next time a function's return columns change.

**Why this matters more than a typical bug fix:** `get_team_agreement_responses` is exactly the data source behind the "Everyone's answers" tab *and* the AI synthesis buttons ("Draft from N answers") — with it broken, a team could submit any number of individual answers and the app would always show zero, with no way to draft a shared answer from them. This is very likely the actual mechanism behind "aggregation isn't working": not a missing feature, but a query that never returned data to aggregate in the first place. `get_team_roster` failing meant the team detail page's roster, and this session's own new `is_owner`-driven UI (the roster "Owner" tag, "only the owner can assemble" messaging), would never have rendered correctly either.

**Why it went undetected through Phase 2 and Phase 3 shipping:** every round of testing in this project so far verified the *client* by temporarily mocking React state (`useState` initial values standing in for what a real Supabase call would return) and screenshotting the result — a legitimate way to check rendering and layout, but it never once executed these functions against a real Postgres instance, so a SQL-level bug inside the function body had no way to surface. Caught this time only because this session spun up a local Postgres 16 instance, replayed every schema file end-to-end, and called each RPC as two different users with real data — which is now the standard for any change to a schema file, not just a rendering check. See `CLAUDE.md`.

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
