# Changelog

All notable changes to Wavelength are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/). Add an entry under
**Unreleased** as part of the change itself; move it under a dated heading
when it's deployed to production.

## [Unreleased]

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
