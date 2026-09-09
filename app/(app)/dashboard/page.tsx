"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MbtiBadge } from "@/components/MbtiBadge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyManual } from "@/lib/hooks/useMyManual";
import { useMyTeams } from "@/lib/hooks/useMyTeams";
import { isFilled, manualCompletion } from "@/lib/manual/data";
import { teamAgreementBadge } from "@/lib/agreement/data";
import type { TeamSummary } from "@/lib/teams/types";

// The logged-in landing page — replaces the marketing home page as "home"
// once someone's signed in (see docs/DECISIONS.md). Centers on the two
// things this redesign is about: your personal manual, and your teams'
// working agreements.
export default function DashboardPage() {
  const { authUser } = useAuth();
  const router = useRouter();
  const { values, loaded: manualLoaded } = useMyManual();
  const { teams, loaded: teamsLoaded } = useMyTeams();

  // One-time-per-sign-in nudge into the wizard when there's no manual
  // saved yet — mirrors the old onboardCheckedRef from app/page.tsx, now
  // scoped to sessionStorage so it survives a hard refresh too.
  useEffect(() => {
    if (!authUser || !manualLoaded) return;
    if (typeof window === "undefined") return;
    const key = `wavelength_onboard_checked_${authUser.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    if (!Object.values(values).some(isFilled)) router.replace("/manual/edit");
  }, [authUser, manualLoaded, values, router]);

  const completion = manualCompletion(values);
  const greetingName = isFilled(values.name) ? values.name.trim() : authUser?.email || "there";

  return (
    <div className="teams-hub dashboard-hub">
      <h1 className="step-title" style={{ marginBottom: 6 }}>Welcome back, {greetingName}</h1>
      <p className="step-subtitle">Your personal manual and your teams' working agreements, all in one place.</p>

      <section className="dashboard-section">
        <h2 className="review-heading">Your personal manual</h2>
        <div className="manual-summary-card">
          <div className="manual-summary-info">
            <div className="manual-summary-progress">
              <div className="manual-summary-progress-track">
                <div className="manual-summary-progress-fill" style={{ width: `${completion.pct}%` }} />
              </div>
              <span className="save-status">{completion.filled} of {completion.total} fields filled</span>
            </div>
            <div className="tag-row" style={{ marginTop: 10 }}>
              {isFilled(values.role) && <span className="tag">{values.role}</span>}
              {isFilled(values.mbtiType) && <MbtiBadge code={values.mbtiType} variant="compact" />}
            </div>
          </div>
          <div className="dashboard-card-actions">
            <Link href="/manual" className="btn btn-secondary">View</Link>
            <Link href="/manual/edit" className="btn btn-primary">Edit</Link>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <h2 className="review-heading" style={{ marginBottom: 0 }}>Your teams</h2>
          <Link href="/teams" className="btn btn-ghost">Manage teams →</Link>
        </div>
        {!teamsLoaded ? (
          <p className="empty-state">Loading your teams…</p>
        ) : teams.length === 0 ? (
          <div className="empty-state-card">
            <p className="step-subtitle" style={{ marginBottom: 14 }}>You&apos;re not on a team yet — create one, or ask a teammate for their invite link.</p>
            <Link href="/teams" className="btn btn-primary">Create or join a team</Link>
          </div>
        ) : (
          <div className="dashboard-grid">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TeamCard({ team }: { team: TeamSummary }) {
  const badge = teamAgreementBadge(team);
  return (
    <div className="team-card">
      <Link href={`/teams/${team.id}`} className="team-card-main">
        <div className="team-card-head">
          <span className="team-card-name">{team.name}</span>
          {team.is_owner && <span className="tag">Owner</span>}
        </div>
        <span className="save-status">{team.member_count} member{team.member_count === 1 ? "" : "s"}</span>
      </Link>
      <div className="team-card-footer">
        <span className={"status-pill status-pill-" + badge.tone}>{badge.label}</span>
        <Link href={`/teams/${team.id}/agreement`} className="team-card-agreement-link">Open agreement →</Link>
      </div>
    </div>
  );
}
