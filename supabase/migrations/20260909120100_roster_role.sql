-- Wavelength — surface a member's "role" (job title, from the wizard's
-- "About You" step) on the team roster, so the new profile cards can show
-- it at a glance without opening someone's full manual.
--
-- Run once, after 20260909120000_team_summary_counts.sql. Safe to re-run.
--
-- Same field as everywhere else — `personal_manuals.values->>'role'` — no
-- new storage. Dropped first because adding a column changes the return
-- signature. Keep the aliased/column-qualified membership-check pattern —
-- see docs/DECISIONS.md (2026-09-05).

drop function if exists public.get_team_roster(uuid);
create or replace function public.get_team_roster(p_team_id uuid)
returns table (user_id uuid, email text, name text, role text, mbti_type text, joined_at timestamptz, has_manual boolean, is_owner boolean)
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
    select tm.user_id, u.email, pm.values ->> 'name', pm.values ->> 'role', pm.values ->> 'mbtiType', tm.joined_at, (pm.user_id is not null), (t.created_by = tm.user_id)
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
