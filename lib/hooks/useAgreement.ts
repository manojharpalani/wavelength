"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AGREEMENT_QUESTIONS, type AgreementDraftRow, type AgreementQuestion, type AgreementResponseRow, type AgreementStatus } from "@/lib/agreement/data";
import { isFilled } from "@/lib/manual/data";

export interface AssistState {
  loading: boolean;
  error?: string;
}

// Everything the Team Working Agreement's three tabs need: load, the
// per-question autosave for your own answers and for the shared draft, AI
// synthesis (single question + "assemble all"), and finalize/reopen.
// Ported from the equivalent state + functions in the old app/page.tsx.
//
// `displayName` is the caller's own manual name (if any) — used only to
// optimistically patch the "everyone's answers" list after a save, so the
// compare tab doesn't need a full reload to show your own name.
export function useAgreement(teamId: string | undefined, displayName: string | null) {
  const { authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myResponses, setMyResponses] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<AgreementResponseRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<AgreementStatus>({ finalizedAt: null, finalizedByEmail: null, finalizedByName: null });
  const [synthesis, setSynthesis] = useState<Record<string, AssistState>>({});
  const [responseSaveStatus, setResponseSaveStatus] = useState<Record<string, "pending" | "saved" | "error">>({});
  const [saveAllState, setSaveAllState] = useState<{ saving: boolean; savedAt?: number }>({ saving: false });
  const [assembleState, setAssembleState] = useState<{ loading: boolean; done: number; total: number; error?: string; confirming?: boolean }>({ loading: false, done: 0, total: 0 });
  const responseSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const draftSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const reload = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const [mine, all, draftRes, statusRes] = await Promise.all([
      supabase.rpc("get_my_agreement_responses", { p_team_id: teamId }),
      supabase.rpc("get_team_agreement_responses", { p_team_id: teamId }),
      supabase.rpc("get_agreement_draft", { p_team_id: teamId }),
      supabase.rpc("get_agreement_status", { p_team_id: teamId }),
    ]);

    const myMap: Record<string, string> = {};
    ((mine.data as { question_key: string; answer: string }[] | null) || []).forEach((r) => {
      myMap[r.question_key] = r.answer;
    });
    setMyResponses(myMap);

    setResponses(((all.data as AgreementResponseRow[] | null) || []).filter((r) => r.answer && r.answer.trim()));

    const draftMap: Record<string, string> = {};
    ((draftRes.data as AgreementDraftRow[] | null) || []).forEach((r) => {
      draftMap[r.question_key] = r.draft_text;
    });
    setDraft(draftMap);

    const statusRow = Array.isArray(statusRes.data) && statusRes.data.length > 0 ? (statusRes.data[0] as { finalized_at: string | null; finalized_by_email: string | null; finalized_by_name: string | null }) : null;
    setStatus({ finalizedAt: statusRow?.finalized_at ?? null, finalizedByEmail: statusRow?.finalized_by_email ?? null, finalizedByName: statusRow?.finalized_by_name ?? null });

    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function saveMyResponseNow(key: string, val: string) {
    if (!teamId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("submit_agreement_response", { p_team_id: teamId, p_question_key: key, p_answer: val });
    if (error) {
      console.error("Wavelength: saving agreement response failed", error);
      setResponseSaveStatus((s) => ({ ...s, [key]: "error" }));
      return;
    }
    setResponseSaveStatus((s) => ({ ...s, [key]: "saved" }));
    setResponses((rows) => {
      const email = authUser?.email || "";
      const name = isFilled(displayName || undefined) ? (displayName as string).trim() : null;
      const others = rows.filter((r) => !(r.question_key === key && r.user_id === authUser?.id));
      if (!val.trim()) return others;
      return [...others, { question_key: key, user_id: authUser?.id || "", email, name, answer: val, updated_at: new Date().toISOString() }];
    });
  }

  function setMyResponse(key: string, val: string) {
    setMyResponses((r) => ({ ...r, [key]: val }));
    setResponseSaveStatus((s) => ({ ...s, [key]: "pending" }));
    if (!teamId) return;
    clearTimeout(responseSaveTimers.current[key]);
    responseSaveTimers.current[key] = setTimeout(() => {
      saveMyResponseNow(key, val);
    }, 900);
  }

  async function saveAllResponsesNow() {
    setSaveAllState({ saving: true });
    AGREEMENT_QUESTIONS.forEach((q) => clearTimeout(responseSaveTimers.current[q.key]));
    await Promise.all(AGREEMENT_QUESTIONS.map((q) => saveMyResponseNow(q.key, myResponses[q.key] || "")));
    setSaveAllState({ saving: false, savedAt: Date.now() });
  }

  function setDraftText(key: string, val: string) {
    setDraft((d) => ({ ...d, [key]: val }));
    setStatus({ finalizedAt: null, finalizedByEmail: null, finalizedByName: null });
    if (!teamId) return;
    const currentTeamId = teamId;
    clearTimeout(draftSaveTimers.current[key]);
    draftSaveTimers.current[key] = setTimeout(() => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      supabase.rpc("save_agreement_draft", { p_team_id: currentTeamId, p_question_key: key, p_draft_text: val }).then(({ error }) => {
        if (error) console.error("Wavelength: saving agreement draft failed", error);
      });
    }, 900);
  }

  async function runSynthesis(q: AgreementQuestion): Promise<boolean> {
    const answers = responses.filter((r) => r.question_key === q.key && r.answer.trim());
    if (answers.length === 0) {
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false, error: "No answers yet to draft from — wait for teammates to answer, or write it yourself." } }));
      return false;
    }
    setSynthesis((s) => ({ ...s, [q.key]: { loading: true } }));
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "team-synthesis",
          question: q.label,
          answers: answers.map((a) => ({ email: a.email, answer: a.answer })),
          currentDraft: draft[q.key],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setDraftText(q.key, data.text);
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false } }));
      return true;
    } catch (err) {
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false, error: err instanceof Error ? err.message : "Something went wrong." } }));
      return false;
    }
  }

  async function runAssembleAll() {
    const questionsWithAnswers = AGREEMENT_QUESTIONS.filter((q) => responses.some((r) => r.question_key === q.key && r.answer.trim()));
    if (questionsWithAnswers.length === 0) {
      setAssembleState({ loading: false, done: 0, total: 0, error: "No teammates have answered any questions yet — nothing to assemble from." });
      return;
    }
    setAssembleState({ loading: true, done: 0, total: questionsWithAnswers.length });
    let failures = 0;
    for (const q of questionsWithAnswers) {
      const ok = await runSynthesis(q);
      if (!ok) failures += 1;
      setAssembleState((s) => ({ ...s, done: s.done + 1 }));
    }
    setAssembleState({
      loading: false,
      done: questionsWithAnswers.length,
      total: questionsWithAnswers.length,
      error: failures > 0 ? `${failures} of ${questionsWithAnswers.length} question${failures === 1 ? "" : "s"} couldn't be drafted — try those individually below.` : undefined,
    });
  }

  function confirmAssembleAll() {
    const hasExistingDraft = AGREEMENT_QUESTIONS.some((q) => (draft[q.key] || "").trim());
    if (hasExistingDraft) {
      setAssembleState((s) => ({ ...s, confirming: true }));
      return;
    }
    runAssembleAll();
  }

  function cancelAssembleConfirm() {
    setAssembleState((s) => ({ ...s, confirming: false }));
  }

  async function setFinalized(finalized: boolean) {
    if (!teamId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("set_agreement_finalized", { p_team_id: teamId, p_finalized: finalized });
    if (error) {
      console.error("Wavelength: updating finalized status failed", error);
      return;
    }
    setStatus(
      finalized
        ? { finalizedAt: new Date().toISOString(), finalizedByEmail: authUser?.email ?? null, finalizedByName: isFilled(displayName || undefined) ? (displayName as string).trim() : null }
        : { finalizedAt: null, finalizedByEmail: null, finalizedByName: null }
    );
  }

  return {
    loading,
    myResponses,
    responses,
    draft,
    status,
    synthesis,
    responseSaveStatus,
    saveAllState,
    assembleState,
    setMyResponse,
    saveAllResponsesNow,
    setDraftText,
    runSynthesis,
    runAssembleAll,
    confirmAssembleAll,
    cancelAssembleConfirm,
    setFinalized,
    reload,
  };
}
