"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SignInModal } from "@/components/SignInModal";

type AuthContextValue = {
  supabaseEnabled: boolean;
  authUser: User | null;
  // True until the initial supabase.auth.getUser() call resolves. Always
  // false (never loading) when Supabase isn't configured at all.
  authLoading: boolean;
  signOut: () => Promise<void>;
  openSignIn: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Wraps the whole app (see app/layout.tsx). Replaces the authUser/auth-
// modal state and the onAuthStateChange effect that used to live at the
// top of app/page.tsx — every route now reads auth state through
// useAuth() instead of prop-drilling from one giant component.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseEnabled = isSupabaseConfigured();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseEnabled);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setAuthUser(data.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        supabaseEnabled,
        authUser,
        authLoading,
        signOut,
        openSignIn: () => setModalOpen(true),
      }}
    >
      {children}
      <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AuthContext.Provider>
  );
}
