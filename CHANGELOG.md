# Changelog

All notable changes to Wavelength are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/). Add an entry under
**Unreleased** as part of the change itself; move it under a dated heading
when it's deployed to production.

## [Unreleased]

- **Fixed: two Postgres functions that made "Everyone's answers" and the roster silently return nothing.** `get_team_agreement_responses` and `get_team_roster` both had an ambiguous unqualified `user_id` reference in their own membership check — plpgsql treats that as an error against the function's own `user_id` output column, so calling either one from the app failed every time and was quietly logged to the console instead of shown anywhere. In practice this meant the "Everyone's answers" tab always looked empty (so there was never anything for the AI to draft from) and the team roster never loaded, no matter how many teammates had actually answered. Neither bug was introduced by this pass — both were caught by testing these functions against a real local Postgres instance for the first time, rather than only mocking the client. Fixed by aliasing the membership-check subquery in every affected function (`schema_phase2.sql`, `schema_phase3.sql`, `schema_manual_sharing.sql`, `schema_team_management.sql` — all safe to re-run). See `docs/DECISIONS.md`.
- Added: the team owner can now assemble the whole shared draft with AI in one action ("✨ Assemble with AI" on the Shared draft tab) instead of clicking "Draft from N answers" once per question — drafts every question that has at least one teammate's answer, with a running progress count, and asks for confirmation first if it would overwrite existing draft text. Other members still see and can use the existing per-question drafting and editing controls.
- Added: clear save confirmation on the "Your answers" tab — each question now shows "Saving…" / "Saved ✓" / "Couldn't save — try again" next to its label as you type, and a "Save my answers" button at the bottom gives an explicit, immediate save instead of relying purely on silent autosave.
- Added: a "Ready to shape this into one agreement?" prompt at the bottom of "Everyone's answers" once anyone has answered, linking straight to the shared draft.
- Added: the team roster now tags the owner ("Owner"), and the "Assemble with AI" card tells non-owners who the owner is instead of just hiding the button.
- Fixed: a real, longstanding CSS bug where any `.home`-based view taller than the viewport had its top portion (nav, heading) permanently clipped and unreachable by scrolling — `justify-content: center` on an overflowing flex container clips symmetrically instead of letting you scroll to the start. Changed to `justify-content: safe center` (`app/globals.css`), which falls back to start-alignment when content overflows. Found while verifying the finalized Team Working Agreement view, but affects any tall `.home` view.
- Changed: rewrote `README.md` for the current architecture (accounts, teams, the working agreement, both AI-assist modes, all five schema files in run order).
- Changed: refreshed the home page for the team pivot — "Teams" is now always visible in the nav (previously only appeared after signing in), the hero has a second "Start or join a team" button alongside the wizard CTA, and the sample-preview dialog gained a third "Team agreement" pill showing a sample finalized agreement.
- Added: team management — rename a team, leave a team (any non-owner member), or delete a team (owner only, with a two-step confirm). Requires running `supabase/schema_team_management.sql` once.
- Added: teammates can now view each other's completed personal manual (read-only) from the team roster — previously the roster only showed a "has a manual" checkmark with no way to actually see it. Requires running `supabase/schema_manual_sharing.sql` once.
- Changed: finalizing the Team Working Agreement now makes it read-only, with an explicit "Edit agreement" button to reopen it — previously any keystroke in the draft (even scrolling/selecting text inside a textarea) silently un-finalized it with no confirmation, which was easy to trigger by accident.
- Added: Team Working Agreement (Phase 3) — 8 shared "how we work" questions (communication, meeting rhythm, decision-making, PR review, on-call, core hours, feedback/conflict, definition of done). Each member answers privately, can see everyone's answers side by side, then any member shapes a shared draft — write it by hand or have Claude draft a proposed team-wide answer from everyone's individual answers. Any member can mark it finalized. Requires running `supabase/schema_phase3.sql` once, after `schema.sql` and `schema_phase2.sql`.
- Added: teams (Phase 2) — create a team, invite teammates with a shareable link (`/join/CODE`), and see a roster of who's joined and who's completed their personal manual. Builds on the same optional-accounts foundation as the previous release: fully hidden until Supabase is configured, and invisible on the Teams entry point (shows a plain "not set up yet" note) rather than a broken UI. Requires running `supabase/schema_phase2.sql` once, after `schema.sql`. The Team Working Agreement itself (the shared "how should we work" content) is still ahead — see `docs/REQUIREMENTS.md` Roadmap.
- Added: optional accounts + persistence via Supabase (magic-link email sign-in, no passwords). Fully optional and hidden entirely when unconfigured — Wavelength works exactly as before if you never sign in. Once signed in, the personal manual autosaves and reloads on later visits; row-level security scopes every read/write to the signed-in user's own data. First step toward a team-oriented direction — see `docs/REQUIREMENTS.md` Roadmap for the phased plan (teams + a collaborative Team Working Agreement are next, not yet built). Requires running `supabase/schema.sql` once against a Supabase project and setting `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Added: optional Myers-Briggs type field (About You step) — self-reported free text, not an in-app quiz, with a nudge to a free external typing site for anyone who doesn't already know theirs. Renders as its own "Personality" section in the detailed manual when filled in; omitted from the one-pager and hidden entirely when left blank.
- Changed: hero headline now breaks onto two lines, with "personal user manual" highlighted in the terracotta accent color on its own line ("A wizard to build your" / "personal user manual.").
- Changed: reworked the why-it-matters cards. Removed the standalone "Better trust. Better collaboration. Better relationships." statement above the cards; the three card titles now carry that message directly as punchy callouts ("Better Trust", "Stronger Collaboration", "Deeper Relationships"). Updated the collaboration card copy from "Less friction. Fewer crossed wires." to "Less friction, better & faster synergy."
- Changed: reworked the home page to fit a single screen with no scrolling. Removed the rings SVG graphic below the hero button and replaced it with a generative, on-brand "wavelength" background — layered soft radial glow plus a tiled sine-wave SVG pattern in the accent/neutral palette — applied site-wide. Moved the sample manual out of its own home-page section into a dialog opened by a new "View sample" button placed next to "Find your wavelength"; the dialog now has a One-pager/Detailed pill toggle so both views live in one place instead of two separate preview buttons. Tightened hero and why-it-matters spacing (smaller headings, reduced margins/padding) to make room. Updated the hero subtitle to "Takes 5 mins and a few honest answers."
- Changed: further stripped down the home page structure — removed the eyebrow/kicker line above the hero headline, removed the "Five minutes, no small talk required" time note, removed the separate "How it works" section entirely, merged the why-it-matters statement and its three benefit cards into one section, renamed the samples section eyebrow from "Not sure what to say yet?" to "Sample", and removed the footer CTA section ("Because nobody comes with instructions" and its "give people a head start" copy). Widened the merged why-it-matters section to match the samples section width now that it holds the benefit cards too.
- Changed: cut the home page down further. Replaced the AI-themed "why this, why now" section (with its support paragraph) with a single tight "Why it matters" statement — "Better trust. Better collaboration. Better relationships." — refocusing the page's why around those three things. Trimmed benefit-card, how-it-works, samples-section, and footer copy across the board; updated the meta description to match.
- Changed: trimmed the home page copy end-to-end (hero, why-this-why-now, benefit cards, how-it-works, footer CTA, meta description) for brevity and a more humble tone, informed by research on personal-user-manual pitfalls (inauthenticity, staleness, excuse-making) reflected in word choice rather than added explanation. Headline is now "A wizard to build your personal user manual."
- Changed: home page hero headline and subtitle rewritten for clarity (feedback was that the description wasn't intuitive) — now states plainly that Wavelength is a wizard for building your own user manual, instead of leading with the "wavelength" metaphor. Kept the existing "Because nobody comes with instructions" eyebrow line.
- Changed: swapped the background-audio track's YouTube video ID (`7jfMnh9c_d4` → `fIgfO9gD5GY`).
- Fixed: the "Preview the detailed version" button on the home page's sample cards was wrapping onto two lines. Widened `.samples-row` (640px → 780px max-width) so both sample-card buttons fit on one line, and added `white-space: nowrap` to `.btn` generally so button labels don't wrap.
- Changed: home page copy for the detailed sample card — "empathetic leader" to "empathetic colleagues."
- Changed: the one-pager's "Quick Facts" strip is no longer a distinct tile/table layout — it's now a regular section (heading + uppercase sub-heading captions + bullets) matching "The Essentials" and every detailed-view section, for visual consistency. Renamed the two one-pager section headings to title case ("Quick Facts", "The Essentials") to match the detailed view's section headings.
- Changed: every field row in the manual output (one-pager and detailed) now renders as a bulleted list, including single-value fields — previously only fields with multiple points were bulleted, which read as inconsistent next to plain-paragraph fields in the same section. The one-pager's Quick Facts tile strip is unchanged (not a bulleted-row layout).
- Changed: redesigned the manual output layout (one-pager and detailed, both the sample preview and a filled-in wizard) — field labels are now small uppercase accent captions stacked above their values instead of a side-by-side column (fixes long labels wrapping raggedly), list bullets use a small accent-colored dot instead of the browser default, section headings get a short accent underline, and the one-pager's Quick Facts render as a bordered stat-tile strip instead of plain rows.
- Changed: manual output (both the one-pager and detailed views) now renders multi-point field values as a bulleted list instead of one run-on paragraph, for fields where the source content is naturally a list (e.g. values, expectations, what helps you do your best work).
- Changed: removed a line from the sample profile's "What I'm working on" field (meeting-style calibration note).
- Changed: swapped the home page's sample one-pager/detailed manual preview from the placeholder "Amara Chen" persona to Manoj Harpalani's own working manual, sourced from his uploaded profile.
- Added: `CLAUDE.md`, `docs/REQUIREMENTS.md`, `docs/DECISIONS.md`, and this
  changelog, to track requirements, key decisions, and release history
  going forward.

## 2026-08-24

- **Rebuilt as an AI-native app.** Ported the static single-file prototype
  to Next.js 15 (App Router) + React 19 + TypeScript, preserving the
  original design and wizard flow 1:1. (`b844821`, `1572765`)
- Added a **"✨ Help me write this"** button to every long-answer wizard
  field: sends the user's rough note to Claude (via the Vercel AI SDK +
  `@ai-sdk/anthropic`) and replaces it with a polished first-person answer.
  Degrades gracefully with an inline message when `ANTHROPIC_API_KEY` isn't
  configured. (`b844821`)
- Moved the background-audio play/pause icon from a fixed top-right widget
  to sit inline next to the "Wavelength" title, in both the home nav and
  wizard sidebar. (`d4db8a6`)
- Removed the instructional subtitle text ("Copy this into a doc, share
  this page, or use your browser's print dialog...") from the review step.
  (`d4db8a6`)
- Added a branded letterhead, professional typography, and footer to the
  Print/Save-as-PDF output — previously the PDF was just the on-screen
  review card with buttons hidden. (`d4db8a6`)
- Initial deploy: ported the static `wavelength-vercel.zip` prototype and
  shipped it to Vercel. (`f4e3b8e`)

**Live:** https://wavelength-iota-two.vercel.app
