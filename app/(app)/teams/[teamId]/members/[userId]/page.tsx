"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ManualBody } from "@/components/ManualBody";
import { useTeamRoster } from "@/lib/hooks/useTeamRoster";
import { useTeamMemberManual } from "@/lib/hooks/useTeamMemberManual";
import { isFilled } from "@/lib/manual/data";

// A teammate's manual as its own page — replaces the old modal
// (renderTeammateManualModal), so it's a real, shareable-within-the-team
// destination rather than a one-off overlay.
export default function TeamMemberPage() {
  const { teamId, userId } = useParams<{ teamId: string; userId: string }>();
  const { roster, loading: rosterLoading } = useTeamRoster(teamId);
  const { values, loading: manualLoading, error } = useTeamMemberManual(teamId, userId);
  const [mode, setMode] = useState<"onepager" | "detailed">("onepager");

  const member = roster.find((m) => m.user_id === userId);
  const displayName = (values && isFilled(values.name) ? values.name!.trim() : null) || member?.name?.trim() || member?.email;

  return (
    <div className="teams-hub">
      <Link href={`/teams/${teamId}`} className="nav-home-link">← Back to team</Link>

      <div className="profile-header">
        <Avatar name={member?.name} email={member?.email} size="lg" />
        <div>
          <h1 className="step-title" style={{ marginBottom: 4 }}>{rosterLoading ? "…" : `Working With ${displayName || "this teammate"}`}</h1>
          <div className="tag-row" style={{ marginTop: 0 }}>
            {member?.role && <span className="tag">{member.role}</span>}
            {member?.mbti_type && <MbtiBadge code={member.mbti_type} variant="compact" />}
          </div>
        </div>
      </div>

      <div className="pill-group" style={{ marginBottom: 26 }}>
        <button type="button" className={"pill" + (mode === "onepager" ? " selected" : "")} onClick={() => setMode("onepager")}>One-pager</button>
        <button type="button" className={"pill" + (mode === "detailed" ? " selected" : "")} onClick={() => setMode("detailed")}>Detailed</button>
      </div>

      {manualLoading ? (
        <p className="empty-state">Loading…</p>
      ) : error ? (
        <p className="empty-state">{error}</p>
      ) : (
        <ManualBody values={values || {}} mode={mode} />
      )}
    </div>
  );
}
