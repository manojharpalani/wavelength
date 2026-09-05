# Wavelength

Wavelength helps a team understand each other faster. Each person builds a
short "how I work" personal manual (a five-minute wizard, with an AI assist
that polishes rough notes into clear first-person answers), and teams shape
a shared Team Working Agreement together — what "done" means, how you
review code, how you handle on-call, and more.

Accounts, saved manuals, and teams are all optional. Without any of it
configured, Wavelength still works exactly as the original personal-manual
wizard did: fill it in, preview it, print it — nothing saved, nothing
shared, no sign-in required.

**Live:** https://wavelength-iota-two.vercel.app/

## Stack

- **Next.js 15** (App Router) + React 19, TypeScript — a single client
  component (`app/page.tsx`) plus a couple of small API/server-component
  routes. Plain CSS (`app/globals.css`), no UI framework.
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for the "✨ Help me write
  this" assist — used both to polish a person's own rough notes, and (on
  the team agreement's "Shared draft" tab) to draft a proposed team-wide
  answer from everyone's individual answers.
- **Supabase** (Postgres + magic-link email auth) for everything account-
  and team-related: saved personal manuals, teams, invite links, and the
  working agreement. Entirely optional — see below.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys you want
npm run dev
```

Open http://localhost:3000.

- Without `ANTHROPIC_API_KEY`, the app still works — "Help me write this"
  and the agreement's AI-drafting button just return a friendly "not
  configured" message instead of a polished answer.
- Without the two `NEXT_PUBLIC_SUPABASE_*` keys, the app still works —
  there's no sign-in, no saved manuals, and the Teams nav link shows a
  plain "not set up yet" message instead of anything broken. Everything
  else (the personal manual wizard, sample previews, print/PDF) behaves
  exactly as it does with accounts on.

## Accounts, teams, and the working agreement (optional)

To turn on sign-in, saved manuals, and teams:

1. Create a free project at [supabase.com](https://supabase.com).
2. In Project Settings → API, copy the Project URL and the anon/publishable
   key into `.env.local` (and into Vercel — see Deploying below):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Apply the database schema — see **Database migrations** below.
4. In Supabase's Auth settings, make sure email (magic link / OTP) sign-in
   is enabled — it is by default on a new project.

Sign-in is passwordless: someone enters their email, gets a link, and
clicking it signs them in — no password ever touches the app.

Why this design is documented in detail in `docs/DECISIONS.md` (search for
the 2026-09-04 entries) — worth reading before changing the RLS/RPC
pattern, since every team-scoped table deliberately has **no** direct row
policies and relies entirely on security-definer functions instead.

## Database migrations

The schema — accounts, teams, the working agreement, and everything since
— lives as ordinary, timestamp-ordered files in `supabase/migrations/`,
applied with the Supabase CLI instead of copy-pasting SQL into the
dashboard's SQL Editor:

- `20260828120000_accounts_and_manuals.sql` — accounts + saved personal
  manuals (`personal_manuals`, owner-only RLS).
- `20260904160000_teams.sql` — teams: create, invite via a shareable link,
  roster (`teams`, `team_members`, deny-by-default RLS + security-definer
  RPCs).
- `20260905000000_team_working_agreement.sql` — the Team Working
  Agreement: shared questions, per-member answers, the editable draft, and
  the finalized state (same RLS pattern as teams).
- `20260905220000_team_management.sql` — rename / leave / delete a team.
- `20260905220100_manual_sharing.sql` — lets teammates view each other's
  completed personal manual (mediated by team membership, not a change to
  `personal_manuals`' own owner-only policies).

**One-time setup**, run yourself in your own terminal — linking asks for
your project ref and (if prompted) your database password, so this isn't
something to script or hand to an assistant:

```bash
npx supabase login                                  # opens a browser to authenticate
npx supabase link --project-ref YOUR_PROJECT_REF     # the <ref> in https://<ref>.supabase.co
npx supabase db push                                 # applies every migration, in order
```

Your project ref is the subdomain in `NEXT_PUBLIC_SUPABASE_URL`. If `link`
or `db push` asks for a database password you don't have handy, find or
reset it in Project Settings → Database.

**From then on**, whenever the migrations folder gets new files (pull the
latest code first):

```bash
npx supabase db push
```

— it applies only what's new, in filename order; nothing to copy, nothing
to run twice by accident. Every migration is written to be safe to re-run
regardless (`create table if not exists`, `create or replace function`,
`drop function if exists` first where a signature changes), which is what
makes the very first `db push` safe against a project that already has
some of this schema from being pasted in by hand before this existed.

## AI assist

`app/api/assist/route.ts` is one small Next.js API route with two modes:

- **Personal** (default): takes a field's label + a person's rough note
  (plus their name/role for context) and asks Claude to turn it into a
  concise, natural, first-person answer. Never invents facts — only
  rephrases what was written.
- **Team synthesis** (`{ mode: "team-synthesis", question, answers,
  currentDraft }`): takes a working-agreement question and every team
  member's individual answer, and asks Claude to propose one cohesive
  team-wide answer. The result always lands in an editable textarea —
  nothing is ever saved automatically.

Both modes degrade the same way without `ANTHROPIC_API_KEY`: a clear
"not configured" message, no broken UI.

## Deploying to Vercel

This project is already linked to a Vercel project (see `.vercel/`). To ship
a change:

```bash
vercel          # preview deployment
vercel --prod   # promote to production
```

Set whichever keys you're using in Vercel too, so they're available at
runtime (repeat for `preview` if you want them there as well):

```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

(Run each command and paste the value when prompted — don't pass it
inline, so it never lands in shell history.)

## Editing content or design

- Wizard steps, review copy, and the sample "Manoj Harpalani" data all live
  in `app/page.tsx`, along with the Team Working Agreement's question set
  (`AGREEMENT_QUESTIONS`) and its own sample data (`SAMPLE_AGREEMENT`).
- Styling lives in `app/globals.css`, including the print/PDF letterhead
  used for both a finished personal manual and a finalized team agreement.
- To swap the background track, replace the video ID (`fIgfO9gD5GY`) in the
  `AudioToggle` component in `app/page.tsx` — make sure you have the right
  to use whatever you swap in for background music on a public page.

## Project docs

- `docs/REQUIREMENTS.md` — what the app does today, and the phased roadmap
  it was built against.
- `docs/DECISIONS.md` — the "why" behind the bigger calls (Supabase vs.
  alternatives, the RLS/RPC design, AI-assist scoping, and more), each
  entry dated.
- `CHANGELOG.md` — a running log of what shipped.
