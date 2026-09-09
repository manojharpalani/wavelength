"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { ReviewSection } from "@/components/ManualBody";
import { AssistButton } from "@/components/AssistButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyManual } from "@/lib/hooks/useMyManual";
import { useMyTeams } from "@/lib/hooks/useMyTeams";
import { useTeamRoster } from "@/lib/hooks/useTeamRoster";
import { useAgreement } from "@/lib/hooks/useAgreement";
import { AGREEMENT_QUESTIONS } from "@/lib/agreement/data";
import { isFilled, printDateString } from "@/lib/manual/data";

type Tab = "respond" | "compare" | "draft";

export default function AgreementPage() {
  return (
    <Suspense fallback={<div className="app-loading">Loading…</div>}>
      <AgreementContent />
    </Suspense>
  );
}

function AgreementContent() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "respond";

  const { authUser } = useAuth();
  const { values } = useMyManual();
  const { teams, loaded: teamsLoaded } = useMyTeams();
  const { roster } = useTeamRoster(teamId);
  const displayName = isFilled(values.name) ? values.name.trim() : null;
  const agreement = useAgreement(teamId, displayName);

  const team = teams.find((t) => t.id === teamId);

  function setTab(next: Tab) {
    router.replace(`/teams/${teamId}/agreement?tab=${next}`);
  }

  if (!teamsLoaded) return <p className="empty-state">Loading…</p>;
  if (!team) {
    return (
      <div className="teams-hub">
        <p className="empty-state">You&apos;re not on this team (or it no longer exists).</p>
        <Link href="/teams" className="btn btn-secondary">← All teams</Link>
      </div>
    );
  }

  return (
    <div className="agreement-page">
      <div className="teams-hub">
        <Link href={`/teams/${team.id}`} className="nav-home-link">← {team.name}</Link>
        <h1 className="step-title" style={{ marginTop: 16, marginBottom: 8 }}>Team Working Agreement</h1>
        <p className="step-subtitle" style={{ marginBottom: 20 }}>
          {agreement.status.finalizedAt
            ? `Finalized ${new Date(agreement.status.finalizedAt).toLocaleDateString()}${agreement.status.finalizedByName || agreement.status.finalizedByEmail ? ` by ${agreement.status.finalizedByName || agreement.status.finalizedByEmail}` : ""}.`
            : "Answer honestly, see how the team compares, then shape it into one shared agreement."}
        </p>

        <div className="pill-group" style={{ marginBottom: 28 }}>
          <button type="button" className={"pill" + (tab === "respond" ? " selected" : "")} onClick={() => setTab("respond")}>Your answers</button>
          <button type="button" className={"pill" + (tab === "compare" ? " selected" : "")} onClick={() => setTab("compare")}>Everyone&apos;s answers</button>
          <button type="button" className={"pill" + (tab === "draft" ? " selected" : "")} onClick={() => setTab("draft")}>Shared draft</button>
        </div>

        {agreement.loading ? (
          <p className="empty-state">Loading…</p>
        ) : tab === "respond" ? (
          <RespondTab agreement={agreement} onCompare={() => setTab("compare")} />
        ) : tab === "compare" ? (
          <CompareTab agreement={agreement} roster={roster} authUserId={authUser?.id} onDraft={() => setTab("draft")} isOwner={team.is_owner} />
        ) : (
          <DraftTab agreement={agreement} roster={roster} isOwner={team.is_owner} />
        )}
      </div>

      <AgreementPrintView teamName={team.name} draft={agreement.draft} />
    </div>
  );
}

function RespondTab({ agreement, onCompare }: { agreement: ReturnType<typeof useAgreement>; onCompare: () => void }) {
  const answeredCount = AGREEMENT_QUESTIONS.filter((q) => (agreement.myResponses[q.key] || "").trim()).length;
  return (
    <div className="agreement-questions">
      <p className="step-subtitle" style={{ marginBottom: 22 }}>
        You&apos;ve answered {answeredCount} of {AGREEMENT_QUESTIONS.length} — skip any you&apos;re not sure about, you can always come back.
      </p>
      {AGREEMENT_QUESTIONS.map((q) => {
        const status = agreement.responseSaveStatus[q.key];
        return (
          <div className="field" key={q.key}>
            <div className="field-label-row">
              <label htmlFor={`aq-${q.key}`}>{q.label}</label>
              <span className={"save-status" + (status === "error" ? " save-status-error" : "")}>
                {status === "pending" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "error" ? "Couldn't save — try again" : ""}
              </span>
            </div>
            <textarea
              id={`aq-${q.key}`}
              value={agreement.myResponses[q.key] || ""}
              placeholder={q.placeholder}
              onChange={(e) => agreement.setMyResponse(q.key, e.target.value)}
            />
          </div>
        );
      })}

      <div className="agreement-finalize">
        <p className="step-subtitle" style={{ marginBottom: 0 }}>
          {agreement.saveAllState.savedAt
            ? "All your answers are saved."
            : "Answers save automatically as you type — or save them explicitly with the button here."}
        </p>
        <div className="agreement-finalize-actions">
          <button type="button" className="btn btn-secondary" disabled={agreement.saveAllState.saving} onClick={agreement.saveAllResponsesNow}>
            {agreement.saveAllState.saving ? "Saving…" : "Save my answers"}
          </button>
          <button type="button" className="btn btn-primary" onClick={onCompare}>See how the team compares →</button>
        </div>
      </div>
    </div>
  );
}

function CompareTab({
  agreement,
  roster,
  authUserId,
  onDraft,
  isOwner,
}: {
  agreement: ReturnType<typeof useAgreement>;
  roster: { user_id: string }[];
  authUserId: string | undefined;
  onDraft: () => void;
  isOwner: boolean;
}) {
  const anyAnswered = agreement.responses.length > 0;
  return (
    <div className="agreement-compare">
      {AGREEMENT_QUESTIONS.map((q) => {
        const rows = agreement.responses.filter((r) => r.question_key === q.key);
        return (
          <div className="review-section" key={q.key}>
            <h3 className="review-heading">{q.label}</h3>
            <span className="roster-badge" style={{ display: "inline-block", marginBottom: 12 }}>
              {rows.length} of {roster.length || 1} answered
            </span>
            {rows.length === 0 ? (
              <p className="empty-state" style={{ margin: "4px 0 0" }}>No one&apos;s answered this yet.</p>
            ) : (
              <div className="agreement-answer-list">
                {rows.map((r) => (
                  <div className="agreement-answer-row" key={r.user_id}>
                    <span className="roster-email">
                      {r.name?.trim() || r.email}
                      {r.user_id === authUserId ? " (you)" : ""}
                    </span>
                    <p className="review-value" style={{ margin: "4px 0 0" }}>{r.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {anyAnswered && (
        <div className="agreement-cta">
          <div>
            <h3 className="review-heading" style={{ marginBottom: 4 }}>Ready to shape this into one agreement?</h3>
            <p className="step-subtitle" style={{ marginBottom: 0 }}>
              {isOwner
                ? "Head to the shared draft to assemble it with AI, or write it by hand."
                : "Head to the shared draft to write or refine it — anyone on the team can edit it."}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onDraft}>Go to shared draft →</button>
        </div>
      )}
    </div>
  );
}

function DraftTab({ agreement, roster, isOwner }: { agreement: ReturnType<typeof useAgreement>; roster: { is_owner: boolean; name: string | null; email: string }[]; isOwner: boolean }) {
  const finalized = Boolean(agreement.status.finalizedAt);

  if (finalized) {
    return (
      <div className="agreement-draft">
        <div className="agreement-finalize agreement-finalize-top">
          <p className="step-subtitle" style={{ marginBottom: 0 }}>
            Finalized {new Date(agreement.status.finalizedAt as string).toLocaleDateString()}
            {agreement.status.finalizedByName || agreement.status.finalizedByEmail ? ` by ${agreement.status.finalizedByName || agreement.status.finalizedByEmail}` : ""}. It&apos;s read-only until someone edits it.
          </p>
          <div className="agreement-finalize-actions">
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
            <button type="button" className="btn btn-ghost" onClick={() => agreement.setFinalized(false)}>Edit agreement</button>
          </div>
        </div>
        {AGREEMENT_QUESTIONS.map((q) => (
          <div className="review-section" key={q.key}>
            <h3 className="review-heading">{q.label}</h3>
            <p className="review-value">{(agreement.draft[q.key] || "").trim() || "Not answered."}</p>
          </div>
        ))}
      </div>
    );
  }

  const answeredCount = AGREEMENT_QUESTIONS.filter((q) => (agreement.draft[q.key] || "").trim()).length;
  const hasDraftContent = answeredCount > 0;
  const totalAnswered = AGREEMENT_QUESTIONS.filter((q) => agreement.responses.some((r) => r.question_key === q.key && r.answer.trim())).length;
  const ownerRow = roster.find((m) => m.is_owner);

  return (
    <div className="agreement-draft">
      <p className="step-subtitle" style={{ marginBottom: 22 }}>
        {answeredCount} of {AGREEMENT_QUESTIONS.length} questions have a shared answer so far.
      </p>

      <div className="agreement-cta assemble-card">
        <div>
          <h3 className="review-heading" style={{ marginBottom: 4 }}>Assemble the team manual with AI</h3>
          <p className="step-subtitle" style={{ marginBottom: 0 }}>
            {isOwner
              ? totalAnswered > 0
                ? `Draft all ${totalAnswered} question${totalAnswered === 1 ? "" : "s"} with teammate answers in one go — you can edit anything after.`
                : "Nothing to assemble yet — wait for teammates to answer a few questions first."
              : `Only ${ownerRow ? ownerRow.name?.trim() || ownerRow.email : "the team owner"} can assemble the whole draft at once — you can still draft or edit any question yourself below.`}
          </p>
          {agreement.assembleState.loading && (
            <p className="step-subtitle" style={{ marginBottom: 0, marginTop: 6 }}>Assembling {agreement.assembleState.done} of {agreement.assembleState.total}…</p>
          )}
          {!agreement.assembleState.loading && agreement.assembleState.error && (
            <p className="assist-error" style={{ marginTop: 6 }}>{agreement.assembleState.error}</p>
          )}
          {agreement.assembleState.confirming && (
            <p className="step-subtitle" style={{ marginBottom: 0, marginTop: 10 }}>
              This will overwrite the current draft for every question with teammate answers.
              <span style={{ display: "inline-flex", gap: 8, marginLeft: 10 }}>
                <button type="button" className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={agreement.runAssembleAll}>Assemble anyway</button>
                <button type="button" className="btn btn-ghost" style={{ padding: "6px 14px" }} onClick={agreement.cancelAssembleConfirm}>Cancel</button>
              </span>
            </p>
          )}
        </div>
        {isOwner && !agreement.assembleState.confirming && (
          <button type="button" className="btn btn-primary" disabled={agreement.assembleState.loading || totalAnswered === 0} onClick={agreement.confirmAssembleAll}>
            {agreement.assembleState.loading ? "Assembling…" : "✨ Assemble with AI"}
          </button>
        )}
      </div>

      {AGREEMENT_QUESTIONS.map((q) => {
        const state = agreement.synthesis[q.key];
        const answerCount = agreement.responses.filter((r) => r.question_key === q.key).length;
        return (
          <div className="field" key={q.key}>
            <div className="field-label-row">
              <label htmlFor={`ad-${q.key}`}>{q.label}</label>
              <AssistButton
                state={state}
                onClick={() => agreement.runSynthesis(q)}
                label={answerCount > 0 ? `Draft from ${answerCount} answer${answerCount === 1 ? "" : "s"}` : "Help me write this"}
                loadingLabel="Drafting…"
              />
            </div>
            {answerCount > 0 && (
              <span className="roster-badge" style={{ display: "inline-block", marginBottom: 8 }}>
                {answerCount} of {roster.length || 1} answered
              </span>
            )}
            <textarea
              id={`ad-${q.key}`}
              value={agreement.draft[q.key] || ""}
              placeholder={answerCount > 0 ? "✨ Draft this from everyone's answers, or write it yourself…" : "Write the team's shared answer here…"}
              onChange={(e) => agreement.setDraftText(q.key, e.target.value)}
            />
            {state?.error && <p className="assist-error">{state.error}</p>}
          </div>
        );
      })}

      <div className="agreement-finalize">
        <p className="step-subtitle" style={{ marginBottom: 0 }}>
          {hasDraftContent
            ? "Once the team's happy with it, mark it finalized — it becomes read-only and ready to print."
            : "Write at least one shared answer before finalizing."}
        </p>
        <button type="button" className="btn btn-primary" disabled={!hasDraftContent} onClick={() => agreement.setFinalized(true)}>Mark as finalized</button>
      </div>
    </div>
  );
}

function AgreementPrintView({ teamName, draft }: { teamName: string; draft: Record<string, string> }) {
  const rows = AGREEMENT_QUESTIONS.map((q) => ({ label: q.label, value: draft[q.key] || "" })).filter((r) => r.value.trim());
  return (
    <div className="agreement-print-view">
      <div className="print-letterhead">
        <div className="print-letterhead-brand"><LogoMark />Wavelength</div>
        <div className="print-letterhead-meta">Team Working Agreement &middot; {printDateString()}</div>
      </div>
      <h1 className="step-title" style={{ marginTop: 8 }}>{teamName}</h1>
      <ReviewSection heading="How We Work" rows={rows} />
      <div className="print-footer">Prepared with Wavelength</div>
    </div>
  );
}
