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
   backend).
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

## Non-functional

- No user accounts or backend persistence — everything lives in client
  state for the session.
- Works without JavaScript-dependent tracking; the only third-party network
  dependency besides the AI call is the YouTube iframe API for optional
  background audio.
- Deployed as a single Vercel project (`soul-map-ai/wavelength`).

## Explicitly out of scope (for now)

- Saving/sharing a manual via a persistent link (current sharing model is
  "print it, or share this page while it's open").
- Multi-user accounts, auth, or storing anyone's answers server-side.
- Editing the AI's suggestion inline before accepting — today it replaces
  the field directly and the user can just keep editing the text.
