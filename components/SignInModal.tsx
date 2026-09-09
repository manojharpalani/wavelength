"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Self-contained magic-link sign-in modal, mounted once by AuthProvider.
// Ported from the old renderAuthModal()/sendMagicLink() in app/page.tsx.
export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ sending: boolean; sent: boolean; error?: string }>({ sending: false, sent: false });

  // Reset the sending/sent/error state (but not the typed email) every
  // time the modal is (re)opened.
  useEffect(() => {
    if (open) setState({ sending: false, sent: false });
  }, [open]);

  if (!open) return null;

  async function sendMagicLink() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setState({ sending: false, sent: false, error: "Enter your email first." });
      return;
    }
    setState({ sending: true, sent: false });
    // Preserve the current path/query (e.g. ?join=CODE) so a sign-in
    // triggered from an invite link lands back on that invite after the
    // magic-link round trip.
    const next = window.location.pathname + window.location.search;
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setState({ sending: false, sent: false, error: error.message });
    else setState({ sending: false, sent: true });
  }

  return (
    <div className="preview-backdrop" onClick={onClose}>
      <div className="preview-modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-head">
          <span className="kicker">Save your progress</span>
          <button type="button" className="btn btn-ghost close-btn" onClick={onClose}>Close</button>
        </div>
        <h2 className="step-title" style={{ fontSize: 22 }}>Sign in with email</h2>
        {state.sent ? (
          <p className="step-subtitle" style={{ marginBottom: 0 }}>
            Check <strong>{email}</strong> for a link to sign in — no password needed.
          </p>
        ) : (
          <>
            <p className="step-subtitle" style={{ marginBottom: 22 }}>
              We&apos;ll email you a link — no password to remember. Your manual then saves automatically as you go.
            </p>
            <div className="field" style={{ marginBottom: 8 }}>
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                placeholder="you@company.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              />
            </div>
            {state.error && <p className="assist-error" style={{ marginBottom: 16 }}>{state.error}</p>}
            <button type="button" className="btn btn-primary" disabled={state.sending} onClick={sendMagicLink} style={{ marginTop: 8 }}>
              {state.sending ? "Sending…" : "Send sign-in link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
