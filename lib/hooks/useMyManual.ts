"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isFilled, type Values } from "@/lib/manual/data";

// Loads (and autosaves) the signed-in user's personal manual. Ported from
// the load/autosave/flush-on-hide effects that used to live at the top of
// app/page.tsx. When Supabase isn't configured, or no one's signed in,
// `values` is just local component state — nothing is persisted, matching
// the original anonymous single-session behavior.
export function useMyManual() {
  const { supabaseEnabled, authUser } = useAuth();
  const [values, setValues] = useState<Values>({});
  const [loaded, setLoaded] = useState(!supabaseEnabled);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valuesRef = useRef(values);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Load whenever the signed-in user changes — but only overwrite local
  // values if nothing's been typed locally yet, so signing in mid-draft
  // never clobbers an in-progress anonymous edit.
  useEffect(() => {
    if (!supabaseEnabled || !authUser) {
      setLoaded(!supabaseEnabled);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    supabase
      .from("personal_manuals")
      .select("values")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const saved = (data?.values as Values) || {};
        setValues((current) => (Object.values(current).some(isFilled) ? current : saved));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled, authUser]);

  // Debounced autosave once signed in and the initial load has settled.
  useEffect(() => {
    if (!supabaseEnabled || !authUser || !loaded) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      supabase
        .from("personal_manuals")
        .upsert({ user_id: authUser.id, values, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error("Wavelength: autosave failed", error);
        });
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, supabaseEnabled, authUser, loaded]);

  // Flush any pending save on visibilitychange/pagehide so a final edit
  // right before closing the tab doesn't get silently dropped by the
  // debounce above.
  useEffect(() => {
    if (!supabaseEnabled || !authUser || !loaded) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const userId = authUser.id;
    const flushPendingSave = () => {
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      supabase
        .from("personal_manuals")
        .upsert({ user_id: userId, values: valuesRef.current, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error("Wavelength: autosave flush failed", error);
        });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushPendingSave);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushPendingSave);
    };
  }, [supabaseEnabled, authUser, loaded]);

  function setField(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  const hasStarted = Object.values(values).some(isFilled);

  return { values, setValues, setField, loaded, hasStarted };
}
