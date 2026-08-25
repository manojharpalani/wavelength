# Wavelength

A five-minute wizard for building a shareable "how I work" manual — now an
AI-native Next.js app on Vercel, with an AI assist that helps polish rough
notes into clear, first-person answers.

**Live:** https://wavelength-iota-two.vercel.app/

## Stack

- **Next.js 15** (App Router) + React 19, TypeScript
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for the "✨ Help me write this"
  assist on each long-answer field
- Plain CSS (ported from the original static prototype) — no UI framework

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

Without `ANTHROPIC_API_KEY` set, the app still works — the AI assist button
just returns a friendly "not configured" message instead of a polished
answer.

## AI assist

`app/api/assist/route.ts` is a small Next.js API route that takes a field's
label + your rough note (plus your name/role for context) and asks Claude to
turn it into a concise, natural, first-person answer. It never invents facts
— only rephrases what you wrote.

## Deploying to Vercel

This project is already linked to a Vercel project (see `.vercel/`). To ship
a change:

```bash
vercel          # preview deployment
vercel --prod   # promote to production
```

Set the API key in Vercel too, so it's available at runtime:

```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
```

(Run each command and paste the key when prompted — don't pass it inline, so
it never lands in shell history.)

## Editing content or design

- Wizard steps, review copy, and the sample "Manoj Harpalani" data all live
  in `app/page.tsx`.
- Styling lives in `app/globals.css`, including the print/PDF letterhead
  used when someone clicks "Print / Save as PDF" on their finished manual.
- To swap the background track, replace the video ID (`fIgfO9gD5GY`) in the
  `AudioToggle` component in `app/page.tsx` — make sure you have the right
  to use whatever you swap in for background music on a public page.
