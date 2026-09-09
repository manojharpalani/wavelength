"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMyTeams } from "@/lib/hooks/useMyTeams";

// Team list + create/join forms. Picking up a "?join=CODE" invite link
// happens on the marketing home page (app/page.tsx) instead — that one
// has to work for signed-out visitors too, which this gated route can't.
export default function TeamsPage() {
  const router = useRouter();
  const { teams, loaded, createTeam, joinByCode } = useMyTeams();
  const [newTeamName, setNewTeamName] = useState("");
  const [createState, setCreateState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinState, setJoinState] = useState<{ loading: boolean; error?: string }>({ loading: false });

  async function handleCreate() {
    setCreateState({ loading: true });
    const { error, team } = await createTeam(newTeamName);
    if (error) {
      setCreateState({ loading: false, error });
      return;
    }
    setCreateState({ loading: false });
    setNewTeamName("");
    if (team) router.push(`/teams/${team.id}`);
  }

  async function handleJoin() {
    setJoinState({ loading: true });
    const { error, teamId } = await joinByCode(joinCodeInput);
    if (error) {
      setJoinState({ loading: false, error });
      return;
    }
    setJoinState({ loading: false });
    setJoinCodeInput("");
    router.push(teamId ? `/teams/${teamId}` : "/teams");
  }

  return (
    <div className="teams-hub">
      <h1 className="step-title" style={{ marginBottom: 8 }}>Your teams</h1>
      <p className="step-subtitle" style={{ marginBottom: 28 }}>
        Build a shared working agreement with your team, and see who&apos;s added their own personal manual along the way.
      </p>

      {!loaded ? (
        <p className="empty-state">Loading your teams…</p>
      ) : teams.length === 0 ? (
        <p className="empty-state">You&apos;re not on a team yet — create one below, or ask a teammate for their invite link.</p>
      ) : (
        <div className="team-list">
          {teams.map((t) => (
            <Link href={`/teams/${t.id}`} key={t.id} className="team-list-item">
              <span className="team-list-name">{t.name}</span>
              {t.is_owner && <span className="tag">Owner</span>}
            </Link>
          ))}
        </div>
      )}

      <div className="teams-forms">
        <div className="teams-form-card">
          <h3>Create a team</h3>
          <div className="field">
            <label htmlFor="new-team-name">Team name</label>
            <input
              id="new-team-name"
              type="text"
              value={newTeamName}
              placeholder="e.g. Platform Team"
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          {createState.error && <p className="assist-error">{createState.error}</p>}
          <button type="button" className="btn btn-primary" disabled={createState.loading} onClick={handleCreate}>
            {createState.loading ? "Creating…" : "Create team"}
          </button>
        </div>
        <div className="teams-form-card">
          <h3>Join a team</h3>
          <div className="field">
            <label htmlFor="join-code">Invite code</label>
            <input
              id="join-code"
              type="text"
              value={joinCodeInput}
              placeholder="e.g. a1b2c3d4"
              onChange={(e) => setJoinCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
          </div>
          {joinState.error && <p className="assist-error">{joinState.error}</p>}
          <button type="button" className="btn btn-secondary" disabled={joinState.loading} onClick={handleJoin}>
            {joinState.loading ? "Joining…" : "Join team"}
          </button>
        </div>
      </div>
    </div>
  );
}
