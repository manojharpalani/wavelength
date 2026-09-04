# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # install deps
npm run dev               # dev server at http://localhost:3000
npm run build              # production build (also runs typecheck + lint)
npm run lint               # eslint
npx tsc --noEmit           # typecheck only, no build
```

There is no test suite yet.

Deploying (project is already linked via `.vercel/`):

```bash
vercel            # preview deployment
vercel --prod     # promote to production (confirm with the user first)
```

Env vars: `ANTHROPIC_API_KEY` powers the AI assist feature. Set locally in
`.env.local` (copy `.env.local.example`); for Vercel, use
`vercel env add ANTHROPIC_API_KEY <production|preview>` and paste the key
when prompted interactively — never pass a key as a command argument or
commit it, so it doesn't land in shell history or git.

## Architecture

This is a Next.js 15 (App Router) rebuild of a single-file static prototype
(originally a Claude Design canvas export). The whole product still lives as
one client component:

- **`app/page.tsx`** — the entire wizard app: data model (`STEPS`,
  `REVIEW_GROUPS`, `ONEPAGER_*`, `SAMPLE_VALUES`), all state (`view`, `step`,
  `values`, `exportView`, `previewOpen`, `assist`), and every UI section
  (home landing page, wizard sidebar/steps, review/manual output, sample
  preview modal). There's no router beyond `/` — "pages" are just `view`/
  `step` state, not Next.js routes. Adding a wizard field means editing the
  `STEPS` array (drives the form) and usually a matching entry in
  `REVIEW_GROUPS`/`ONEPAGER_*` (drives what shows up in the generated
  manual) — these are separate data structures kept manually in sync.
- **`app/globals.css`** — all styling, including a `@media print` block that
  is the *only* styling used when the user clicks "Print / Save as PDF"
  (`window.print()` in `page.tsx`). Print output gets its own letterhead
  (`.print-letterhead`, `.print-footer`) that's `display: none` on screen
  and only shown in print — check this block when changing what the
  exported PDF looks like, not the screen styles.
- **`app/api/assist/route.ts`** — the one server-side piece: takes a field
  label + the user's rough draft + light context (name/role), calls Claude
  via the Vercel AI SDK (`generateText` + `@ai-sdk/anthropic`), and returns
  polished first-person text. Returns 501 with a friendly message (rendered
  inline in the UI, not thrown) when `ANTHROPIC_API_KEY` is unset — preserve
  that graceful-degradation behavior rather than erroring the page.
- **Audio widget** (`AudioToggle` in `page.tsx`) — loads the YouTube iframe
  API imperatively (script tag + `window.onYouTubeIframeAPIReady`) and
  plays a hidden, off-screen video for background audio only. The video ID
  is hardcoded (`fIgfO9gD5GY`); swap it there to change the track.
- **`lib/supabase/{client,server,config}.ts`, `middleware.ts`,
  `app/auth/callback/route.ts`** — optional accounts + persistence.
  `config.ts`'s `isSupabaseConfigured()` gates everything: with
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset, the
  browser/server clients return `null` and every call site (in `page.tsx`,
  the middleware, the callback route) no-ops instead of throwing — the app
  must keep working exactly as before when these are unset. `client.ts` is
  the browser client (magic-link sign-in, session state, autosave);
  `server.ts` is for Route Handlers; `middleware.ts` refreshes the auth
  cookie on every request; `app/auth/callback/route.ts` exchanges the
  magic-link code for a session. See `docs/DECISIONS.md` (2026-09-04) for
  the reasoning and `supabase/schema.sql` for the DB schema + RLS
  policies — run that file in the Supabase SQL Editor once per project.

### Vercel project quirk

The Vercel project (`soul-map-ai/wavelength`) was originally created for a
plain static site, so its dashboard framework setting doesn't auto-detect
Next.js. `vercel.json` pins `"framework": "nextjs"` to override that — don't
remove it or builds will fail with "No Output Directory named public".

## Documentation to keep in sync

When you make a change, update the relevant doc(s) in the same commit:

- **`CHANGELOG.md`** — every user-facing or deploy-worthy change gets an
  entry (Keep a Changelog style), added when the change is made, not
  batched later.
- **`docs/DECISIONS.md`** — append an entry for any non-obvious technical or
  product choice (a library pick, an architecture change, a tradeoff) with
  the reasoning, so the "why" isn't lost.
- **`docs/REQUIREMENTS.md`** — update when the product's intended behavior
  or scope changes (new feature, changed flow, new constraint).
