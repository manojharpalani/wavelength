"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AppShell } from "@/components/AppShell";

// Auth gate + persistent nav for the whole logged-in app (dashboard,
// manual view, teams, agreement). The wizard (app/manual/edit) is
// deliberately outside this group — it's usable without an account, see
// docs/DECISIONS.md.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabaseEnabled, authUser, authLoading } = useAuth();
  const router = useRouter();

  // No accounts configured at all — these routes need one, so send
  // visitors to the one thing that still works without an account.
  useEffect(() => {
    if (!supabaseEnabled) router.replace("/manual/edit");
  }, [supabaseEnabled, router]);

  useEffect(() => {
    if (supabaseEnabled && !authLoading && !authUser) router.replace("/");
  }, [supabaseEnabled, authLoading, authUser, router]);

  if (!supabaseEnabled) return null;
  if (authLoading) return <div className="app-loading">Loading…</div>;
  if (!authUser) return null;

  return <AppShell>{children}</AppShell>;
}
