"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ActionState {
  loading: boolean;
  error?: string;
}

// Rename/leave/delete for one team — ported from the equivalent functions
// in the old app/page.tsx. Kept separate from useTeamRoster/useMyTeams
// since only the team detail page needs these.
export function useTeamActions(teamId: string | undefined) {
  const [renameState, setRenameState] = useState<ActionState>({ loading: false });
  const [actionState, setActionState] = useState<ActionState>({ loading: false });

  async function rename(name: string): Promise<{ error?: string }> {
    if (!teamId) return {};
    const trimmed = name.trim();
    if (!trimmed) {
      setRenameState({ loading: false, error: "Give the team a name." });
      return { error: "Give the team a name." };
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Something went wrong." };
    setRenameState({ loading: true });
    const { error } = await supabase.rpc("rename_team", { p_team_id: teamId, p_name: trimmed });
    if (error) {
      setRenameState({ loading: false, error: error.message });
      return { error: error.message };
    }
    setRenameState({ loading: false });
    return {};
  }

  async function leave(): Promise<{ error?: string }> {
    if (!teamId) return {};
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Something went wrong." };
    setActionState({ loading: true });
    const { error } = await supabase.rpc("leave_team", { p_team_id: teamId });
    if (error) {
      setActionState({ loading: false, error: error.message });
      return { error: error.message };
    }
    setActionState({ loading: false });
    return {};
  }

  async function remove(): Promise<{ error?: string }> {
    if (!teamId) return {};
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { error: "Something went wrong." };
    setActionState({ loading: true });
    const { error } = await supabase.rpc("delete_team", { p_team_id: teamId });
    if (error) {
      setActionState({ loading: false, error: error.message });
      return { error: error.message };
    }
    setActionState({ loading: false });
    return {};
  }

  return { renameState, actionState, rename, leave, remove };
}
