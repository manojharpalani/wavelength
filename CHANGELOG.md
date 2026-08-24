# Changelog

All notable changes to Wavelength are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/). Add an entry under
**Unreleased** as part of the change itself; move it under a dated heading
when it's deployed to production.

## [Unreleased]

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
