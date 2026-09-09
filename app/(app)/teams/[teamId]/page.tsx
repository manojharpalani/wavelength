"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { MbtiBadge } from "@/components/MbtiBadge";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyTeams } from "@/lib/hooks/useMyTeams";
import { useTeamRoster } from "@/lib/hooks/useTeamRoster";
import { useTeamActions } from "@/lib/hooks/useTeamActions";
import { teamAgreementBadge } from "@/lib/agreement/data";

// Team detail: invite link, the roster as a grid of teammate profile
// cards (each linking to its own page instead of the old modal), the
// agreement status card moved near the top for prominence, and
// rename/leave/delete tucked into a "Team settings" disclosure.
export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { authUser } = useAuth();
  const { teams, loaded: teamsLoaded, reload: reloadTeams } = useMyTeams();
  const { roster, loading: rosterLoading } = useTeamRoster(teamId);
  const { renameState, actionState, rename, leave, remove } = useTeamActions(teamId);

  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const team = teams.find((t) => t.id === teamId);

  if (!teamsLoaded) return <p className="empty-state">Loading team…</p>;
  if (!team) {
    return (
      <div className="teams-hub">
        <p className="empty-state">You&apos;re not on this team (or it no longer exists).</p>
        <Link href="/teams" className="btn btn-secondary">← All teams</Link>
      </div>
    );
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/join/${team.invite_code}` : "";
  const badge = teamAgreementBadge(team);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      // Clipboard API can be unavailable — the invite URL is still shown
      // in a selectable input either way.
    }
  }

  async function handleRename() {
    const { error } = await rename(renameInput);
    if (!error) {
      setRenaming(false);
      await reloadTeams();
    }
  }

  async function handleLeave() {
    const { error } = await leave();
    if (!error) {
      await reloadTeams();
      router.push("/teams");
    }
  }

  async function handleDelete() {
    const { error } = await remove();
    if (!error) {
      await reloadTeams();
      router.push("/teams");
    }
  }

  return (
    <div className="teams-hub">
      <Link href="/teams" className="nav-home-link">← All teams</Link>

      {renaming ? (
        <div className="field" style={{ maxWidth: 360, marginTop: 16 }}>
          <label htmlFor="rename-team-input">Team name</label>
          <input
            id="rename-team-input"
            type="text"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          {renameState.error && <p className="assist-error">{renameState.error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" disabled={renameState.loading} onClick={handleRename}>
              {renameState.loading ? "Saving…" : "Save name"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setRenaming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="team-title-row">
          <h1 className="step-title" style={{ marginTop: 16, marginBottom: 8 }}>{team.name}</h1>
          {team.is_owner && (
            <button type="button" className="btn btn-ghost" onClick={() => { setRenameInput(team.name); setRenaming(true); }}>Rename</button>
          )}
        </div>
      )}
      <p className="step-subtitle" style={{ marginBottom: 20 }}>{team.member_count} member{team.member_count === 1 ? "" : "s"} · Share this link so teammates can join.</p>

      <div className="invite-row">
        <input type="text" readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
        <button type="button" className="btn btn-secondary" onClick={copyInvite}>{copyState === "copied" ? "Copied!" : "Copy link"}</button>
      </div>

      <div className="agreement-cta">
        <div>
          <h3 className="review-heading" style={{ marginBottom: 6 }}>Team Working Agreement</h3>
          <span className={"status-pill status-pill-" + badge.tone}>{badge.label}</span>
        </div>
        <Link href={`/teams/${team.id}/agreement`} className="btn btn-primary">Open agreement</Link>
      </div>

      <h3 className="review-heading" style={{ marginTop: 36 }}>Who&apos;s on this team</h3>
      {rosterLoading ? (
        <p className="empty-state">Loading roster…</p>
      ) : (
        <div className="member-grid">
          {roster.map((m) => {
            const clickable = m.has_manual && m.user_id !== authUser?.id;
            const label = m.name?.trim() || m.email;
            const cardBody = (
              <>
                <Avatar name={m.name} email={m.email} />
                <div className="member-card-info">
                  <span className="member-card-name">
                    {label}
                    {m.user_id === authUser?.id ? " (you)" : ""}
                  </span>
                  <span className="tag-row" style={{ marginTop: 4 }}>
                    {m.is_owner && <span className="tag">Owner</span>}
                    {m.role && <span className="save-status">{m.role}</span>}
                    {m.mbti_type && <MbtiBadge code={m.mbti_type} variant="compact" />}
                  </span>
                </div>
                <span className={"roster-badge" + (m.has_manual ? " roster-badge-done" : "")}>
                  {m.has_manual ? "Manual added" : "No manual yet"}
                </span>
              </>
            );
            return clickable ? (
              <Link href={`/teams/${team.id}/members/${m.user_id}`} key={m.user_id} className="member-card member-card-clickable">
                {cardBody}
              </Link>
            ) : (
              <div className="member-card member-card-muted" key={m.user_id}>{cardBody}</div>
            );
          })}
        </div>
      )}

      <div className="danger-zone">
        <button type="button" className="btn btn-ghost" onClick={() => setSettingsOpen((v) => !v)}>
          {settingsOpen ? "Hide team settings" : "Team settings"}
        </button>
        {settingsOpen && (
          <div style={{ marginTop: 16 }}>
            {actionState.error && <p className="assist-error">{actionState.error}</p>}
            {team.is_owner ? (
              confirmingDelete ? (
                <>
                  <p className="step-subtitle" style={{ marginBottom: 10 }}>
                    Delete &quot;{team.name}&quot; for everyone? This removes the roster and the working agreement — it can&apos;t be undone.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="btn btn-primary btn-danger" disabled={actionState.loading} onClick={handleDelete}>
                      {actionState.loading ? "Deleting…" : "Delete for good"}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn btn-ghost danger-link" onClick={() => setConfirmingDelete(true)}>Delete team</button>
              )
            ) : confirmingLeave ? (
              <>
                <p className="step-subtitle" style={{ marginBottom: 10 }}>Leave &quot;{team.name}&quot;? You can rejoin later with an invite link.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-secondary" disabled={actionState.loading} onClick={handleLeave}>
                    {actionState.loading ? "Leaving…" : "Leave team"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmingLeave(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-ghost danger-link" onClick={() => setConfirmingLeave(true)}>Leave team</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
