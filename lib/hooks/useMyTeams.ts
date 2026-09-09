"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TeamSummary } from "@/lib/teams/types";

export function useMyTeams() {
  const { supabaseEnabled, authUser } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!supabaseEnabled || !authUser) {
      setTeams([]);
      setLoaded(true);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_my_teams");
    if (!error) setTeams((data as TeamSummary[]) || []);
    setLoaded(true);
  }, [supabaseEnabled, authUser]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createTeam(name: string): Promise<{ error?: string; team?: TeamSummary }> {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Give the team a name." };
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Something went wrong." };
    const { data, error } = await supabase.rpc("create_team", { p_name: trimmed });
    if (error) return { error: error.message };
    await reload();
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string; invite_code: string }) : null;
    if (!row) return {};
    return {
      team: { id: row.id, name: row.name, invite_code: row.invite_code, joined_at: new Date().toISOString(), is_owner: true, member_count: 1, agreement_finalized_at: null, agreement_draft_count: 0 },
    };
  }

  async function joinByCode(rawCode: string): Promise<{ error?: string; teamId?: string }> {
    const code = rawCode.trim();
    if (!code) return { error: "Enter an invite code." };
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Something went wrong." };
    const { data, error } = await supabase.rpc("join_team_by_code", { p_code: code });
    if (error) return { error: error.message };
    await reload();
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string }) : null;
    return { teamId: row?.id };
  }

  return { teams, loaded, reload, createTeam, joinByCode };
}
