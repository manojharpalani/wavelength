# Key Decisions

A running log of non-obvious technical and product choices, with the
reasoning, so the "why" survives past whoever made the call. Append new
entries at the top; don't rewrite history — if a decision gets reversed,
add a new entry that supersedes it and note what changed.

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
