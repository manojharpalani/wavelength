-- Wavelength — enrich get_my_teams() with a member count and a rollup of
-- the team's working agreement status, so the new dashboard can render a
-- status pill per team without an extra round trip (4 RPCs) per team.
--
-- Run once, after 20260908130000_roster_mbti.sql. Safe to re-run.
--
-- Dropped first because adding columns changes the return signature —
-- CREATE OR REPLACE can't do that on its own.

drop function if exists public.get_my_teams();
create or replace function public.get_my_teams()
returns table (
  id uuid,
  name text,
  invite_code text,
  joined_at timestamptz,
  is_owner boolean,
  member_count int,
  agreement_finalized_at timestamptz,
  agreement_draft_count int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.name,
    t.invite_code,
    tm.joined_at,
    (t.created_by = auth.uid()),
    (select count(*) from team_members tm2 where tm2.team_id = t.id)::int,
    ta.finalized_at,
    (select count(*) from team_agreement_drafts d where d.team_id = t.id and length(trim(d.draft_text)) > 0)::int
  from team_members tm
  join teams t on t.id = tm.team_id
  left join team_agreements ta on ta.team_id = t.id
  where tm.user_id = auth.uid()
  order by tm.joined_at desc;
$$;

revoke all on function public.get_my_teams() from public;
grant execute on function public.get_my_teams() to authenticated;
