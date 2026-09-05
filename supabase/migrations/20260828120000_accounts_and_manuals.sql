-- Wavelength — Phase 1 schema: accounts + persisted personal manuals.
--
-- Run this once in the Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste -> Run). Safe to re-run: every
-- statement is idempotent (`if not exists` / `drop policy if exists`).
--
-- Auth itself (the `auth.users` table, magic-link email sending) is
-- managed entirely by Supabase — nothing to create for that here.
--
-- Team tables (Phase 2: teams, team_members, team invites) and the
-- collaborative Team Working Agreement tables (Phase 3) are intentionally
-- not in this file yet — see docs/REQUIREMENTS.md for the phased plan.

create table if not exists public.personal_manuals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_manuals enable row level security;

drop policy if exists "select own manual" on public.personal_manuals;
create policy "select own manual"
  on public.personal_manuals for select
  using (auth.uid() = user_id);

drop policy if exists "insert own manual" on public.personal_manuals;
create policy "insert own manual"
  on public.personal_manuals for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own manual" on public.personal_manuals;
create policy "update own manual"
  on public.personal_manuals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own manual" on public.personal_manuals;
create policy "delete own manual"
  on public.personal_manuals for delete
  using (auth.uid() = user_id);
