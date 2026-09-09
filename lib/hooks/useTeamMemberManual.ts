"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Values } from "@/lib/manual/data";

// Reads a teammate's manual via the get_team_member_manual RPC, which
// mediates access (requires caller and target both be members of the same
// team) without loosening personal_manuals' own RLS — see
// supabase/migrations/20260905220100_manual_sharing.sql.
export function useTeamMemberManual(teamId: string | undefined, userId: string | undefined) {
  const [values, setValues] = useState<Values | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!teamId || !userId) return;
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.rpc("get_team_member_manual", { p_team_id: teamId, p_user_id: userId }).then(({ data, error: err }) => {
      if (cancelled) return;
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as { manual_values: Values }) : null;
      if (err || !row) {
        console.error("Wavelength: loading teammate manual failed", err);
        setError("Couldn't load this manual right now — try again in a moment.");
      } else {
        setValues(row.manual_values || {});
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, userId]);

  return { values, loading, error };
}
