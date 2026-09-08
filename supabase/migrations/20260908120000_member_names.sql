-- Wavelength — surface each member's name (not just email) in team views.
--
-- Run once, after schema.sql, schema_phase2.sql, and schema_phase3.sql.
-- Safe to re-run.
--
-- A member's name lives only in `personal_manuals.values->>'name'` (the
-- wizard's own "About You" field) — there's no separate signup form or
-- profiles table. This left-joins that value into the three functions
-- that currently show a person's email in the roster, the "everyone's
-- answers" comparison, and the finalized-agreement byline, falling back
-- to email in the UI when a member hasn't filled in a name yet. No change
-- to `personal_manuals`' own RLS — these are all pre-existing
-- security-definer RPCs that already read it (get_team_roster already
-- joins it for `has_manual`).
--
-- Both functions are dropped first because adding a column changes their
-- return signature — CREATE OR REPLACE can't do that on its own. Keep the
-- aliased/column-qualified membership-check pattern (`tm_check.team_id`,
-- `tm_check.user_id`) — a bare `user_id` here is the exact ambiguous-
-- column bug documented in docs/DECISIONS.md (2026-09-05).

drop function if exists public.get_team_roster(uuid);
create or replace function public.get_team_roster(p_team_id uuid)
returns table (user_id uuid, email text, name text, joined_at timestamptz, has_manual boolean, is_owner boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from team_members tm_check
    where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()
  ) then
    raise exception 'Not a member of this team';
  end if;

  return query
    select tm.user_id, u.email, pm.values ->> 'name', tm.joined_at, (pm.user_id is not null), (t.created_by = tm.user_id)
    from team_members tm
    join auth.users u on u.id = tm.user_id
    join teams t on t.id = tm.team_id
    left join personal_manuals pm on pm.user_id = tm.user_id
    where tm.team_id = p_team_id
    order by tm.joined_at asc;
end;
$$;

revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to authenticated;

drop function if exists public.get_team_agreement_responses(uuid);
create or replace function public.get_team_agreement_responses(p_team_id uuid)
returns table (question_key text, user_id uuid, email text, name text, answer text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select r.question_key, r.user_id, u.email, pm.values ->> 'name', r.answer, r.updated_at
    from team_agreement_responses r
    join auth.users u on u.id = r.user_id
    left join personal_manuals pm on pm.user_id = r.user_id
    where r.team_id = p_team_id
    order by r.question_key, r.updated_at asc;
end;
$$;

revoke all on function public.get_team_agreement_responses(uuid) from public;
grant execute on function public.get_team_agreement_responses(uuid) to authenticated;

drop function if exists public.get_agreement_status(uuid);
create or replace function public.get_agreement_status(p_team_id uuid)
returns table (finalized_at timestamptz, finalized_by_email text, finalized_by_name text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  return query
    select a.finalized_at, u.email, pm.values ->> 'name'
    from team_agreements a
    left join auth.users u on u.id = a.finalized_by
    left join personal_manuals pm on pm.user_id = a.finalized_by
    where a.team_id = p_team_id;
end;
$$;

revoke all on function public.get_agreement_status(uuid) from public;
grant execute on function public.get_agreement_status(uuid) to authenticated;
