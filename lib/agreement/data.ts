// ---------- team working agreement content model ----------
//
// Ported out of the old single-file app/page.tsx. `question_key` in the
// database is exactly this `key`, free text, no foreign key — see
// supabase/migrations/20260905000000_team_working_agreement.sql.

export type AgreementQuestion = { key: string; label: string; placeholder: string };

export const AGREEMENT_QUESTIONS: AgreementQuestion[] = [
  { key: "communication", label: "How should we communicate day-to-day?", placeholder: "e.g. Slack for anything that can wait an hour; call or huddle for anything urgent." },
  { key: "meetingRhythm", label: "What's our meeting rhythm?", placeholder: "e.g. 15-min standup daily, 1:1s every other week, no-meeting Fridays." },
  { key: "decisionMaking", label: "How do we make decisions as a team?", placeholder: "e.g. Whoever's closest to the work decides; loop in the team for anything hard to reverse." },
  { key: "prReview", label: "What's our standard for reviewing code?", placeholder: "e.g. Same-day review turnaround; small PRs preferred; one approval to merge." },
  { key: "onCall", label: "What do we expect from each other during on-call or urgent issues?", placeholder: "e.g. Acknowledge a page within 15 minutes; escalate if you're stuck for more than 30." },
  { key: "coreHours", label: "What are our core hours and availability norms?", placeholder: "e.g. Overlap 10am-2pm ET; otherwise work when it suits your timezone and focus." },
  { key: "feedbackConflict", label: "How do we want to give feedback and handle disagreement?", placeholder: "e.g. Say it directly and soon, in private first; disagree openly in design reviews, commit once we decide." },
  { key: "definitionOfDone", label: "What does \"done\" mean for our team?", placeholder: "e.g. Tests pass, docs updated, reviewed, and deployed — not just merged." },
];

export type AgreementResponseRow = { question_key: string; user_id: string; email: string; name: string | null; answer: string; updated_at: string };
export type AgreementDraftRow = { question_key: string; draft_text: string; updated_at: string; updated_by_email: string | null };
export type AgreementStatus = { finalizedAt: string | null; finalizedByEmail: string | null; finalizedByName: string | null };

// A finished-looking sample, shown in the "View a sample" preview — not
// real team data, just something concrete for a first-time visitor to
// picture their own team filling in.
export const SAMPLE_AGREEMENT: Record<string, string> = {
  communication: "We default to async — Slack threads and written docs — and save meetings for things that need real discussion. If something's blocking you, ping the person directly instead of waiting on a channel.",
  meetingRhythm: "A 15-minute standup daily, 1:1s every other week, and no internal meetings on Fridays.",
  decisionMaking: "Whoever's closest to the work decides. For anything hard to reverse, we loop in the team first.",
  prReview: "Same-day review turnaround. Small PRs are strongly preferred. One approval to merge.",
  onCall: "Acknowledge a page within 15 minutes. Escalate if you're stuck for more than 30.",
  coreHours: "Overlap 10am–2pm ET. Outside that, work when it suits your timezone and focus.",
  feedbackConflict: "Say it directly and soon, privately first. Disagree openly in design reviews — once we decide, we commit.",
  definitionOfDone: "Tests pass, docs are updated, it's been reviewed, and it's deployed — not just merged.",
};

// Long-form status line, used on the team detail page (which has the full
// agreement loaded already via useAgreement).
export function agreementStatusSummary(opts: { loading: boolean; finalizedAt: string | null; draftAnsweredCount: number }) {
  if (opts.loading) return "Checking status…";
  if (opts.finalizedAt) {
    return `Finalized ${new Date(opts.finalizedAt).toLocaleDateString()} — everyone answers a shared set of "how we work" questions, then shapes the answers into one agreement together.`;
  }
  if (opts.draftAnsweredCount > 0) {
    return `Draft in progress — ${opts.draftAnsweredCount} of ${AGREEMENT_QUESTIONS.length} questions have a shared answer so far.`;
  }
  return `Not started yet — everyone answers a shared set of "how we work" questions, then shapes the answers into one agreement together.`;
}

// Short badge, used on dashboard/team cards fed straight from the
// enriched get_my_teams() columns (no full agreement load required).
export function teamAgreementBadge(team: { agreement_finalized_at: string | null; agreement_draft_count: number }) {
  if (team.agreement_finalized_at) return { label: "Finalized ✓", tone: "done" as const };
  if (team.agreement_draft_count > 0) return { label: `Draft — ${team.agreement_draft_count} of ${AGREEMENT_QUESTIONS.length}`, tone: "progress" as const };
  return { label: "Not started", tone: "muted" as const };
}
