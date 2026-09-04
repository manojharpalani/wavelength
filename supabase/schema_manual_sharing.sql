-- Wavelength — let teammates view each other's completed personal manual.
--
-- Run once in the Supabase SQL Editor, after schema.sql and
-- schema_phase2.sql (needs both `personal_manuals` and `team_members`).
-- Safe to re-run.
--
-- `personal_manuals`' own RLS policies (from schema.sql) stay exactly as
-- they are — owner-only. This adds one security-definer RPC that mediates
-- read access through team membership instead of opening up the table's
-- policies: the caller must be on the same team as the person whose
-- manual they're asking for. Two people on no team together still can't
-- see each other's manuals through this or any other path.

create or replace function public.get_team_member_manual(p_team_id uuid, p_user_id uuid)
returns table (manual_values jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;
  if not exists (select 1 from team_members where team_id = p_team_id and user_id = auth.uid()) then
    raise exception 'Not a member of this team';
  end if;
  if not exists (select 1 from team_members where team_id = p_team_id and user_id = p_user_id) then
    raise exception 'That person is not on this team';
  end if;

  return query
    select pm.values as manual_values, pm.updated_at
    from personal_manuals pm
    where pm.user_id = p_user_id;
end;
$$;

revoke all on function public.get_team_member_manual(uuid, uuid) from public;
grant execute on function public.get_team_member_manual(uuid, uuid) to authenticated;
