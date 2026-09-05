-- Wavelength — team management basics: rename, leave, delete.
--
-- Run once in the Supabase SQL Editor, after schema.sql, schema_phase2.sql,
-- and schema_phase3.sql. Safe to re-run (create/replace throughout).
--
-- No new tables — these are RPCs over the existing `teams`/`team_members`
-- tables from schema_phase2.sql, following the same security-definer
-- pattern. "Owner" isn't a separate role column; it's whoever's
-- `auth.uid()` matches `teams.created_by` (same definition already used by
-- get_my_teams' `is_owner` column).

-- Renames a team. Owner only.
create or replace function public.rename_team(p_team_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'Team name is required';
  end if;
  if not exists (select 1 from teams where id = p_team_id and created_by = auth.uid()) then
    raise exception 'Only the team owner can rename this team';
  end if;

  update teams set name = trim(p_name) where id = p_team_id;
end;
$$;

-- Removes the caller from a team. Owners can't leave (delete the team
-- instead) — this keeps every team unambiguously owned, without a
-- transfer-ownership flow to build.
create or replace function public.leave_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  if exists (select 1 from teams where id = p_team_id and created_by = auth.uid()) then
    raise exception 'Owners can''t leave a team — delete it instead, or ask a teammate to take over';
  end if;
  if not exists (select 1 from team_members tm_check where tm_check.team_id = p_team_id and tm_check.user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;

  delete from team_members where team_id = p_team_id and user_id = auth.uid();
end;
$$;

-- Deletes a team outright. Owner only. Cascades to team_members,
-- team_agreement_responses, team_agreement_drafts, and team_agreements via
-- the "on delete cascade" foreign keys already in schema_phase2.sql /
-- schema_phase3.sql — nothing extra to clean up here.
create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  if not exists (select 1 from teams where id = p_team_id and created_by = auth.uid()) then
    raise exception 'Only the team owner can delete this team';
  end if;

  delete from teams where id = p_team_id;
end;
$$;

revoke all on function public.rename_team(uuid, text) from public;
grant execute on function public.rename_team(uuid, text) to authenticated;

revoke all on function public.leave_team(uuid) from public;
grant execute on function public.leave_team(uuid) to authenticated;

revoke all on function public.delete_team(uuid) from public;
grant execute on function public.delete_team(uuid) to authenticated;
