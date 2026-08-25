# Changelog

All notable changes to Wavelength are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/). Add an entry under
**Unreleased** as part of the change itself; move it under a dated heading
when it's deployed to production.

## [Unreleased]

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
