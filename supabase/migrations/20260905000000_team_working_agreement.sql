-- Wavelength — Phase 3 schema: the collaborative Team Working Agreement.
--
-- Run once in the Supabase SQL Editor, after schema.sql and
-- schema_phase2.sql. Safe to re-run (create/replace + drop-if-exists
-- throughout).
--
-- Same design as Phase 2: `team_agreement_responses`, `team_agreement_drafts`,
-- and `team_agreements` all have RLS enabled with NO direct policies —
-- every read and write goes through a security-definer RPC below, each of
-- which checks the caller is a member of the team before touching its rows.
-- The question set itself (labels, placeholders, ordering) lives in the app
-- (app/page.tsx's AGREEMENT_QUESTIONS) — question_key is a free-text key,
-- not a foreign key, so relabeling a question in the app doesn't need a
-- migration here.

-- Each team member's individual answer to one question.
create table if not exists public.team_agreement_responses (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null,
  answer text not null default '',
  updated_at timestamptz not null default now(),
  primary key (team_id, user_id, question_key)
);

-- The shared, editable "team answer" per question. Any member can edit —
-- see save_agreement_draft below. Editing a draft clears finalized_at on
-- team_agreements, so a finalized agreement reopens as soon as someone
-- changes it.
create table if not exists public.team_agreement_drafts (
  team_id uuid not null references public.teams (id) on delete cascade,
  question_key text not null,
  draft_text text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (team_id, question_key)
);

-- One row per team: whether the agreement is currently marked finalized.
-- Absent (no row) means "never finalized" — treated the same as
-- finalized_at being null.
create table if not exists public.team_agreements (
  team_id uuid primary key references public.teams (id) on delete cascade,
  finalized_at timestamptz,
  finalized_by uuid references auth.users (id) on delete set null
);

alter table public.team_agreement_responses enable row level security;
alter table public.team_agreement_drafts enable row level security;
alter table public.team_agreements enable row level security;
-- No policies on any of the three, on purpose — see note above.

-- Upserts the caller's own answer to one question. Idempotent.
create or replace function public.submit_agreement_response(p_team_id uuid, p_question_key text, p_answer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;

  insert into team_agreement_responses (team_id, user_id, question_key, answer, updated_at)
    values (p_team_id, auth.uid(), p_question_key, coalesce(p_answer, ''), now())
  on conflict (team_id, user_id, question_key)
    do update set answer = excluded.answer, updated_at = now();
end;
$$;

-- The caller's own answers for a team, across all questions.
create or replace function public.get_my_agreement_responses(p_team_id uuid)
returns table (question_key text, answer text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select r.question_key, r.answer, r.updated_at
    from team_agreement_responses r
    where r.team_id = p_team_id and r.user_id = auth.uid();
end;
$$;

-- Every member's answers for a team, across all questions — used for the
-- "everyone's answers" comparison view and as the input to AI synthesis.
create or replace function public.get_team_agreement_responses(p_team_id uuid)
returns table (question_key text, user_id uuid, email text, answer text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select r.question_key, r.user_id, u.email, r.answer, r.updated_at
    from team_agreement_responses r
    join auth.users u on u.id = r.user_id
    where r.team_id = p_team_id
    order by r.question_key, r.updated_at asc;
end;
$$;

-- The shared draft, across all questions.
create or replace function public.get_agreement_draft(p_team_id uuid)
returns table (question_key text, draft_text text, updated_at timestamptz, updated_by_email text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select d.question_key, d.draft_text, d.updated_at, u.email
    from team_agreement_drafts d
    left join auth.users u on u.id = d.updated_by
    where d.team_id = p_team_id;
end;
$$;

-- Upserts the shared draft text for one question. Any team member may
-- call this (not just the team owner), per the collaborative-editing
-- design. Saving a draft edit reopens a finalized agreement.
create or replace function public.save_agreement_draft(p_team_id uuid, p_question_key text, p_draft_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;

  insert into team_agreement_drafts (team_id, question_key, draft_text, updated_at, updated_by)
    values (p_team_id, p_question_key, coalesce(p_draft_text, ''), now(), auth.uid())
  on conflict (team_id, question_key)
    do update set draft_text = excluded.draft_text, updated_at = now(), updated_by = auth.uid();

  update team_agreements set finalized_at = null, finalized_by = null where team_id = p_team_id;
end;
$$;

-- Whether the agreement is currently finalized, and by whom. Returns no
-- rows if the team has never touched the finalized flag.
create or replace function public.get_agreement_status(p_team_id uuid)
returns table (finalized_at timestamptz, finalized_by_email text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select a.finalized_at, u.email
    from team_agreements a
    left join auth.users u on u.id = a.finalized_by
    where a.team_id = p_team_id;
end;
$$;

-- Marks the agreement finalized or reopens it. Any team member may call
-- this, matching the "any member can edit and finalize" design.
create or replace function public.set_agreement_finalized(p_team_id uuid, p_finalized boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  -- Aliased/qualified: unqualified `user_id` here would be ambiguous
  -- against this function's own `user_id` OUT parameter wherever one
  -- exists (e.g. get_team_agreement_responses) under plpgsql's default
  -- #variable_conflict = error. See docs/DECISIONS.md.
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;

  insert into team_agreements (team_id, finalized_at, finalized_by)
    values (
      p_team_id,
      case when p_finalized then now() else null end,
      case when p_finalized then auth.uid() else null end
    )
  on conflict (team_id) do update set
    finalized_at = case when p_finalized then now() else null end,
    finalized_by = case when p_finalized then auth.uid() else null end;
end;
$$;

revoke all on function public.submit_agreement_response(uuid, text, text) from public;
grant execute on function public.submit_agreement_response(uuid, text, text) to authenticated;

revoke all on function public.get_my_agreement_responses(uuid) from public;
grant execute on function public.get_my_agreement_responses(uuid) to authenticated;

revoke all on function public.get_team_agreement_responses(uuid) from public;
grant execute on function public.get_team_agreement_responses(uuid) to authenticated;

revoke all on function public.get_agreement_draft(uuid) from public;
grant execute on function public.get_agreement_draft(uuid) to authenticated;

revoke all on function public.save_agreement_draft(uuid, text, text) from public;
grant execute on function public.save_agreement_draft(uuid, text, text) to authenticated;

revoke all on function public.get_agreement_status(uuid) from public;
grant execute on function public.get_agreement_status(uuid) to authenticated;

revoke all on function public.set_agreement_finalized(uuid, boolean) from public;
grant execute on function public.set_agreement_finalized(uuid, boolean) to authenticated;
