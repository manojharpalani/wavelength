"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RosterRow } from "@/lib/teams/types";

export function useTeamRoster(teamId: string | undefined) {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_team_roster", { p_team_id: teamId });
    if (!error) setRoster((data as RosterRow[]) || []);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { roster, loading, reload };
}
