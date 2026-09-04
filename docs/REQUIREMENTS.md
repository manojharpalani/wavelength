# Requirements

What Wavelength is supposed to do, as currently understood. Update this file
whenever the intended behavior, scope, or constraints change — not just when
the code does.

## Purpose

A five-minute wizard that turns a person's honest, short answers into a
shareable "how I work" manual, so teammates (new or existing) don't have to
guess how to collaborate with them — and a place for a team to shape a
shared Team Working Agreement together, once they're both part of the same
journey.

## Core flow

1. **Home** — landing page explaining the product, with a primary CTA
   ("Find your wavelength" / "Pick up where you left off" once the user has
   started), a secondary "Start or join a team" CTA, and a sample-preview
   dialog (One-pager / Detailed / Team agreement) so a first-time visitor
   can see what both kinds of output look like before starting. "Teams" is
   always in the nav when Supabase is configured, whether or not you're
   signed in yet.
2. **Wizard** — seven short form sections (About You, How You Communicate,
   How You Work, Feedback & Support, Values & Expectations, Strengths &
   Growth, A Few More Things), navigable via a sidebar with progress
   indication. Answers persist in memory for the session (not saved to a
   backend). About You includes an optional, self-reported Myers-Briggs
   type field — free text, no in-app quiz (avoids MBTI licensing/IP
   concerns and the scope of building a real typing instrument). Renders
   as its own "Personality" section in the detailed manual when filled
   in; omitted from the one-pager, hidden entirely when blank.
3. **Your Manual (review step)** — renders the collected answers as a
   document, toggle-able between a **Detailed** view (full sections) and a
   **One-pager** view (quick facts + essentials only). Empty state shown if
   nothing's filled in yet.
4. **Export** — "Print / Save as PDF" opens the browser print dialog; the
   printed/PDF output uses a distinct, professional layout: a Wavelength
   letterhead (logo, "Personal Working Manual", date), no app chrome
   (sidebar, nav, buttons all hidden), and a "Prepared with Wavelength"
   footer. The same letterhead styling is reused for a finalized Team
   Working Agreement.

## AI assist

Each long-answer (textarea) field has a "✨ Help me write this" button that
sends the user's rough note (plus their name/role for light context) to an
LLM and replaces the field with a polished, first-person rewrite. The Team
Working Agreement's shared-draft tab has an equivalent button per question
("Draft from N answers") that synthesizes everyone's individual answers
into one proposed team-wide statement instead.

Constraints:
- Must never fabricate facts, credentials, or specifics the user didn't
  provide — it rephrases, it doesn't invent.
- If no draft text is present, it prompts the user to jot a note first
  rather than generating one from nothing.
- Must degrade gracefully (inline message, not a crash or dead button) when
  no API key is configured.

## Accounts & persistence (optional)

Signing in is entirely optional — Wavelength works exactly as before
(everything in client state, nothing saved) if you never sign in, and the
sign-in affordance itself is hidden completely when Supabase is not
configured (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
unset) — no broken buttons, no dead flow.

When it's configured:
- "Sign in to save your progress" (home nav and wizard sidebar) opens a
  modal that sends a passwordless magic-link email — no password ever
  created or stored by Wavelength.
- Once signed in, the personal manual autosaves (debounced, ~900ms after
  the last keystroke) to a `personal_manuals` row keyed to the account, and
  reloads automatically on a later visit.
- Signing in never clobbers an in-progress anonymous draft: the saved
  manual only loads if the current in-memory form is still empty.
- Row-level security (see `supabase/schema.sql`) restricts every direct
  read and write to the signed-in user's own row. Teammates can view
  (read-only) a completed manual belonging to someone on the same team,
  mediated by a `security definer` RPC — see "Teams" below — not by a
  change to that row-level policy.

## Teams & the working agreement

Once a team exists (see Roadmap Phase 2/3 for how it got built):

- Any member can rename the team; the owner can delete it (two-step
  confirm); any non-owner member can leave. There's currently no way for
  the owner to leave without deleting the team, or to hand ownership to
  someone else — see "Explicitly out of scope."
- The roster shows every member and whether they've completed their
  personal manual; clicking a teammate who has one opens it read-only.
- The Team Working Agreement is 8 shared questions. Each member answers
  privately first, can see everyone's answers side by side, then any
  member shapes a shared draft (by hand, or via AI synthesis from
  everyone's answers). Any member can mark it **finalized** — the
  agreement then becomes read-only (only "Print / Save as PDF" and an
  explicit "Edit agreement" button are shown); editing it again is a
  deliberate action, not a side effect of clicking into a field.

## Non-functional

- No backend persistence unless Supabase is configured (see "Accounts &
  persistence" above) — the default, out-of-the-box experience is still
  fully client-side with nothing saved.
- Works without JavaScript-dependent tracking; the only third-party network
  dependencies are the AI call, the optional Supabase auth/DB calls, and
  the YouTube iframe API for optional background audio.
- Deployed as a single Vercel project (`soul-map-ai/wavelength`).

## Explicitly out of scope (for now)

- Saving/sharing a manual via a persistent, publicly-shareable link outside
  a team (a signed-in user's manual is visible only to themself and their
  teammates — there's no "share a read-only link to anyone" feature).
- Transferring team ownership, or an owner leaving a team they own (they
  can only delete it).
- Real-time collaborative editing of the Team Working Agreement draft — two
  people editing at once will overwrite each other; there's no live
  presence or conflict handling.
- URL deep-linking / browser-back support for team and agreement views —
  navigating between the wizard, teams, and the agreement is all in-memory
  `view` state, not real routes, so a refresh or a shared link always lands
  on the home page.
- Editing the AI's suggestion inline before accepting — today it replaces
  the field/textarea directly and the user can just keep editing the text.

## Roadmap: team working agreement

Wavelength is deliberately expanding from an individual tool toward a team
one — the stated direction is "working better together as a team," where a
team collaboratively builds a shared working agreement and each member also
builds (optional, but encouraged) their own personal manual along the way.
Phased so each step ships independent value:

- **Phase 0 — done.** Optional self-reported Myers-Briggs type field.
- **Phase 1 — done.** Accounts + persistence (Supabase auth + a Postgres
  `personal_manuals` table), described above. Converts the personal manual
  from session-only to saved-per-account; no team concept yet.
- **Phase 2 — done.** Teams: create a team, invite members via a shareable
  link (`/join/CODE`), a roster showing who's joined, who's completed
  their personal manual (with read-only viewing of it), and team
  management (rename/leave/delete). `teams`/`team_members` use
  deny-by-default RLS — all access goes through `security definer` RPCs
  (see `supabase/schema_phase2.sql`, `supabase/schema_team_management.sql`,
  `supabase/schema_manual_sharing.sql`, and docs/DECISIONS.md).
- **Phase 3 — done.** Collaborative Team Working Agreement: 8 shared
  "how should we work" questions (communication, meeting rhythm,
  decision-making, PR review standard, on-call expectations, core hours,
  feedback/conflict, definition of done). Each member answers privately
  first ("Your answers"), can see everyone's answers side by side
  ("Everyone's answers"), then any member can shape a shared draft
  ("Shared draft") — write it by hand, or have Claude synthesize a
  proposed team-wide answer from what everyone said. Any member can mark
  the agreement finalized, which makes it read-only until someone
  explicitly chooses to edit it again. A finalized agreement
  exports/prints with the same letterhead styling as the personal manual.
  `team_agreement_responses`, `team_agreement_drafts`, and
  `team_agreements` follow the same deny-by-default RLS + `security
  definer` RPC pattern as Phase 2 — see `supabase/schema_phase3.sql` and
  docs/DECISIONS.md.
