# Requirements

What Wavelength is supposed to do, as currently understood. Update this file
whenever the intended behavior, scope, or constraints change — not just when
the code does.

## Purpose

A five-minute wizard that turns a person's honest, short answers into a
shareable "how I work" manual, so teammates (new or existing) don't have to
guess how to collaborate with them.

## Core flow

1. **Home** — landing page explaining the product, with a primary CTA
   ("Find your wavelength" / "Pick up where you left off" once the user has
   started) and two sample previews (one-pager and detailed) so a
   first-time visitor can see what the output looks like before starting.
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
   footer.

## AI assist

Each long-answer (textarea) field has a "✨ Help me write this" button that
sends the user's rough note (plus their name/role for light context) to an
LLM and replaces the field with a polished, first-person rewrite.

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
- Row-level security (see `supabase/schema.sql`) restricts every read and
  write to the signed-in user's own row — nobody else's data is reachable
  through the anon key, even though that key is public by design.

## Non-functional

- No backend persistence unless Supabase is configured (see "Accounts &
  persistence" above) — the default, out-of-the-box experience is still
  fully client-side with nothing saved.
- Works without JavaScript-dependent tracking; the only third-party network
  dependencies are the AI call, the optional Supabase auth/DB calls, and
  the YouTube iframe API for optional background audio.
- Deployed as a single Vercel project (`soul-map-ai/wavelength`).

## Explicitly out of scope (for now)

- Saving/sharing a manual via a persistent, publicly-shareable link (a
  signed-in user is the only one who can load their own saved manual —
  there's no "share a read-only link to my manual" feature yet).
- Teams: creating/joining a team, a shared Team Working Agreement, and
  aggregating multiple members' answers into one document. Planned next —
  see "Roadmap" below. Not yet built.
- Editing the AI's suggestion inline before accepting — today it replaces
  the field directly and the user can just keep editing the text.

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
  link (`/join/CODE`), a roster showing who's joined and who's completed
  their personal manual. `teams`/`team_members` use deny-by-default RLS —
  all access goes through `security definer` RPCs (see
  `supabase/schema_phase2.sql` and docs/DECISIONS.md).
- **Phase 3 — done.** Collaborative Team Working Agreement: 8 shared
  "how should we work" questions (communication, meeting rhythm,
  decision-making, PR review standard, on-call expectations, core hours,
  feedback/conflict, definition of done). Each member answers privately
  first ("Your answers"), can see everyone's answers side by side
  ("Everyone's answers"), then any member can shape a shared draft
  ("Shared draft") — write it by hand, or have Claude synthesize a
  proposed team-wide answer from what everyone said. Any member can mark
  the agreement finalized; editing the draft afterward reopens it
  automatically. A finalized agreement exports/prints with the same
  letterhead styling as the personal manual. `team_agreement_responses`,
  `team_agreement_drafts`, and `team_agreements` follow the same
  deny-by-default RLS + `security definer` RPC pattern as Phase 2 — see
  `supabase/schema_phase3.sql` and docs/DECISIONS.md.
