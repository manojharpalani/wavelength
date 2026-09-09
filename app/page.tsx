"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoMark } from "@/components/LogoMark";
import { HomeVideoEmbed } from "@/components/HomeVideoEmbed";
import { ManualBody, ReviewSection } from "@/components/ManualBody";
import { docTitleFor, SAMPLE_VALUES } from "@/lib/manual/data";
import { AGREEMENT_QUESTIONS, SAMPLE_AGREEMENT } from "@/lib/agreement/data";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// The marketing landing page — signed-out visitors only. A signed-in
// visitor is redirected straight to /dashboard, which is now the
// logged-in experience's home (see docs/DECISIONS.md). The one exception
// is a pending "?join=CODE" invite link, handled inline below so it keeps
// working for a signed-out visitor exactly like it used to.
export default function HomePage() {
  return (
    <Suspense fallback={<div className="app-loading">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { supabaseEnabled, authUser, authLoading, openSignIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinCode = searchParams.get("join");

  const [previewOpen, setPreviewOpen] = useState<"onepager" | "detailed" | "agreement" | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ teamName: string | null; checked: boolean } | null>(null);
  const [joinState, setJoinState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const joinedRef = useRef(false);

  // Preview the invited team's name — works even signed out (the RPC is
  // granted to anon too) so a link can say "join <team>" before sign-in.
  useEffect(() => {
    if (!joinCode) {
      setPendingInvite(null);
      return;
    }
    setPendingInvite({ teamName: null, checked: false });
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setPendingInvite({ teamName: null, checked: true });
      return;
    }
    supabase
      .rpc("get_team_by_invite_code", { p_code: joinCode })
      .then(({ data }) => {
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string }) : null;
        setPendingInvite({ teamName: row?.name ?? null, checked: true });
      });
  }, [joinCode]);

  // Once signed in with a pending invite, join automatically and head
  // straight to the team.
  useEffect(() => {
    if (!joinCode || !authUser || joinedRef.current) return;
    joinedRef.current = true;
    setJoinState({ loading: true });
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.rpc("join_team_by_code", { p_code: joinCode }).then(({ data, error }) => {
      if (error) {
        setJoinState({ loading: false, error: error.message });
        joinedRef.current = false;
        return;
      }
      const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string }) : null;
      router.replace(row ? `/teams/${row.id}` : "/teams");
    });
  }, [joinCode, authUser, router]);

  // A signed-in visitor with nothing pending just belongs on the
  // dashboard — "/" is the marketing page now, not the logged-in home.
  useEffect(() => {
    if (supabaseEnabled && !authLoading && authUser && !joinCode) {
      router.replace("/dashboard");
    }
  }, [supabaseEnabled, authLoading, authUser, joinCode, router]);

  if (supabaseEnabled && (authLoading || (authUser && !joinCode))) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <div className="app">
      <div className="home">
        <div className="home-nav">
          <div className="home-brand">
            <LogoMark />
            <span className="home-wordmark">Wavelength</span>
          </div>
          {supabaseEnabled && !authUser && (
            <button type="button" className="auth-nav-link" onClick={openSignIn}>Sign in</button>
          )}
        </div>

        {joinCode && (
          <div className="invite-banner" style={{ width: "100%", maxWidth: 720 }}>
            {!pendingInvite || !pendingInvite.checked ? (
              <p>Checking invite link…</p>
            ) : pendingInvite.teamName ? (
              <>
                <p>You&apos;ve been invited to join <strong>{pendingInvite.teamName}</strong>.</p>
                {authUser ? (
                  <p className="step-subtitle" style={{ marginBottom: 0 }}>{joinState.loading ? "Joining…" : ""}</p>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={openSignIn}>Sign in to join</button>
                )}
                {joinState.error && <p className="assist-error">{joinState.error}</p>}
              </>
            ) : (
              <p>That invite link doesn&apos;t match a team — double check the link, or ask for a fresh one.</p>
            )}
          </div>
        )}

        <section className="hero">
          <h1 className="hero-title">
            Build your team&apos;s
            <br />
            <span style={{ color: "var(--accent)" }}>shared working agreement</span>.
          </h1>
          <p className="hero-subtitle">
            Every teammate starts with a few honest answers about how they work, then you shape it into one agreement together.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={supabaseEnabled ? "/teams" : "/manual/edit"}>Start or join a team</a>
            <a className="btn btn-secondary" href="/manual/edit">Find your wavelength</a>
          </div>
          <button type="button" className="btn btn-ghost hero-sample-link" onClick={() => setPreviewOpen("agreement")}>View a sample</button>
        </section>

        <HomeVideoEmbed />

        <section className="vision-section">
          <span className="section-eyebrow">Why it matters</span>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6.5" strokeWidth="1.6" /><circle cx="15" cy="12" r="6.5" strokeWidth="1.6" /></svg></div>
              <h3>Stronger Collaboration</h3>
              <p>Everyone knows the plan, not just their part of it.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.6" /><path d="M8 12.3l2.6 2.6L16 9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h3>Better Trust</h3>
              <p>Grows faster when there&apos;s nothing to guess.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M5.5 15.5a9 9 0 0 1 13 0" strokeWidth="1.6" strokeLinecap="round" /><path d="M8.3 18a5 5 0 0 1 7.4 0" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="20" r="1.1" stroke="none" fill="currentColor" /></svg></div>
              <h3>Deeper Relationships</h3>
              <p>Built on understanding, not small talk.</p>
            </div>
          </div>
        </section>
      </div>

      {previewOpen && (
        <div className="preview-backdrop" onClick={() => setPreviewOpen(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-head">
              <span className="kicker">{previewOpen === "agreement" ? "Sample team agreement" : "Sample manual"}</span>
              <button type="button" className="btn btn-ghost close-btn" onClick={() => setPreviewOpen(null)}>Close</button>
            </div>
            <h2 className="step-title" style={{ fontSize: 26 }}>{previewOpen === "agreement" ? "Platform Team" : docTitleFor(SAMPLE_VALUES)}</h2>
            <p className="step-subtitle" style={{ marginBottom: 20 }}>
              {previewOpen === "agreement"
                ? "A glimpse of a finalized Team Working Agreement — every team's will read differently."
                : "Just a glimpse of what's possible — your own words will live here soon enough."}
            </p>
            <div className="pill-group" style={{ marginBottom: 26 }}>
              <button type="button" className={"pill" + (previewOpen === "agreement" ? " selected" : "")} onClick={() => setPreviewOpen("agreement")}>Team agreement</button>
              <button type="button" className={"pill" + (previewOpen === "onepager" ? " selected" : "")} onClick={() => setPreviewOpen("onepager")}>One-pager</button>
              <button type="button" className={"pill" + (previewOpen === "detailed" ? " selected" : "")} onClick={() => setPreviewOpen("detailed")}>Detailed</button>
            </div>
            {previewOpen === "agreement" ? (
              <ReviewSection heading="How We Work" rows={AGREEMENT_QUESTIONS.map((q) => ({ label: q.label, value: SAMPLE_AGREEMENT[q.key] }))} />
            ) : (
              <ManualBody values={SAMPLE_VALUES} mode={previewOpen} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
