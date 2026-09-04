-- Wavelength — Phase 2 schema: teams + invite-link membership.
--
-- Run once in the Supabase SQL Editor, after schema.sql. Safe to re-run
-- (create/replace + drop-if-exists throughout).
--
-- Design: `teams` and `team_members` have RLS enabled with NO direct
-- policies — every read and write goes through a security-definer RPC
-- below instead of PostgREST table access. That keeps the invite-code
-- join flow (and "who's on this team") correct without needing to model
-- "can see this row" as a row-level predicate, and it means a compromised
-- anon key can't be used to enumerate teams or memberships directly.
--
-- Team Working Agreement content itself (Phase 3) is not in this file —
-- this phase is membership only, per docs/REQUIREMENTS.md's Roadmap.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
-- No policies on either table on purpose — see note above.

-- Creates a team, generates a short invite code, and adds the creator as
-- the first member, all atomically.
create or replace function public.create_team(p_name text)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  if length(trim(p_name)) = 0 then
    raise exception 'Team name is required';
  end if;

  v_code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into teams (name, created_by, invite_code)
    values (trim(p_name), auth.uid(), v_code)
    returning teams.id into v_id;

  insert into team_members (team_id, user_id) values (v_id, auth.uid());

  return query select v_id, trim(p_name), v_code;
end;
$$;

-- Read-only preview of a team by its invite code — safe for a signed-out
-- visitor to call (so an invite link can show "You've been invited to
-- join <team>" before asking them to sign in). Returns nothing for an
-- unknown code rather than erroring, so the UI can show a clean
-- "invite link not found" state.
create or replace function public.get_team_by_invite_code(p_code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select id, name from teams where invite_code = lower(trim(p_code));
$$;

-- Joins the caller to the team for a given invite code. Idempotent —
-- joining a team you're already in is a no-op, not an error.
create or replace function public.join_team_by_code(p_code text)
returns table (id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;

  select teams.id, teams.name into v_id, v_name
    from teams where invite_code = lower(trim(p_code));

  if v_id is null then
    raise exception 'Invite link not found or no longer valid';
  end if;

  insert into team_members (team_id, user_id) values (v_id, auth.uid())
    on conflict (team_id, user_id) do nothing;

  return query select v_id, v_name;
end;
$$;

-- Every team the caller belongs to.
create or replace function public.get_my_teams()
returns table (id uuid, name text, invite_code text, joined_at timestamptz, is_owner boolean)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.name, t.invite_code, tm.joined_at, (t.created_by = auth.uid())
  from team_members tm
  join teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
  order by tm.joined_at desc;
$$;

-- Roster for one team: who's joined, when, and whether they've started
-- their personal manual. Raises if the caller isn't a member.
create or replace function public.get_team_roster(p_team_id uuid)
returns table (user_id uuid, email text, joined_at timestamptz, has_manual boolean)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  ) then
    raise exception 'Not a member of this team';
  end if;

  return query
    select tm.user_id, u.email, tm.joined_at, (pm.user_id is not null)
    from team_members tm
    join auth.users u on u.id = tm.user_id
    left join personal_manuals pm on pm.user_id = tm.user_id
    where tm.team_id = p_team_id
    order by tm.joined_at asc;
end;
$$;

revoke all on function public.get_team_by_invite_code(text) from public;
grant execute on function public.get_team_by_invite_code(text) to anon, authenticated;

revoke all on function public.create_team(text) from public;
grant execute on function public.create_team(text) to authenticated;

revoke all on function public.join_team_by_code(text) from public;
grant execute on function public.join_team_by_code(text) to authenticated;

revoke all on function public.get_my_teams() from public;
grant execute on function public.get_my_teams() to authenticated;

revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to authenticated;
