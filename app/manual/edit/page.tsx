"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { ManualBody } from "@/components/ManualBody";
import { AssistButton, type AssistState } from "@/components/AssistButton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMyManual } from "@/lib/hooks/useMyManual";
import { STEPS, deriveTags, docTitleFor, printDateString, type FieldDef } from "@/lib/manual/data";

// The wizard — reachable with or without an account (see
// docs/DECISIONS.md), so it lives outside the auth-gated app/(app) route
// group and keeps its own left-rail chrome rather than the shared
// AppShell. `step` is a query param instead of local state so a refresh
// or a shared link lands back on the same step.
export default function ManualEditPage() {
  return (
    <Suspense fallback={<div className="app-loading">Loading…</div>}>
      <ManualEditContent />
    </Suspense>
  );
}

function ManualEditContent() {
  const { supabaseEnabled, authUser, openSignIn, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { values, setField, setValues } = useMyManual();
  const [exportView, setExportView] = useState<"detailed" | "onepager">("detailed");
  const [assist, setAssist] = useState<Record<string, AssistState>>({});

  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.id === (searchParams.get("step") || "about")));
  const stepDef = STEPS[stepIndex === -1 ? 0 : stepIndex];
  const total = STEPS.length;
  const formStepCount = total - 1;
  const isReview = stepDef.kind === "review";
  const isForm = stepDef.kind === "form";
  const progressPct = isReview ? 100 : Math.round((stepIndex / formStepCount) * 100);
  const lastFormIndex = formStepCount - 1;
  const nextLabel = stepIndex === lastFormIndex ? "Review my manual" : "Next";
  const docTitle = docTitleFor(values);

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    router.replace(`/manual/edit?step=${STEPS[clamped].id}`);
  }

  async function runAssist(fieldKey: string, label: string) {
    const draft = (values[fieldKey] || "").trim();
    if (!draft) {
      setAssist((a) => ({ ...a, [fieldKey]: { loading: false, error: "Add a rough note first, then I can help polish it." } }));
      return;
    }
    setAssist((a) => ({ ...a, [fieldKey]: { loading: true } }));
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, draft, context: { name: values.name, role: values.role } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setField(fieldKey, data.text);
      setAssist((a) => ({ ...a, [fieldKey]: { loading: false } }));
    } catch (err) {
      setAssist((a) => ({ ...a, [fieldKey]: { loading: false, error: err instanceof Error ? err.message : "Something went wrong." } }));
    }
  }

  function renderField(f: FieldDef) {
    const raw = values[f.key] || "";
    const id = `field-${f.key}`;
    const state = assist[f.key];

    if (f.kind === "text") {
      return (
        <div className="field" key={f.key}>
          <label htmlFor={id}>{f.label}</label>
          <input id={id} type="text" value={raw} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
        </div>
      );
    }
    if (f.kind === "textarea") {
      return (
        <div className="field" key={f.key}>
          <div className="field-label-row">
            <label htmlFor={id}>{f.label}</label>
            <AssistButton state={state} onClick={() => runAssist(f.key, f.label)} />
          </div>
          <textarea id={id} value={raw} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
          {state?.error && <p className="assist-error">{state.error}</p>}
        </div>
      );
    }
    if (f.kind === "tags") {
      const tags = deriveTags(raw);
      return (
        <div className="field" key={f.key}>
          <label htmlFor={id}>{f.label}</label>
          <textarea id={id} value={raw} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
          {tags.length > 0 && (
            <div className="tag-row">
              {tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (f.kind === "select") {
      return (
        <div className="field" key={f.key}>
          <label htmlFor={id}>{f.label}</label>
          <select id={id} value={raw} onChange={(e) => setField(f.key, e.target.value)}>
            <option value="">Select…</option>
            {f.options!.map((opt) => (
              <option key={opt} value={opt}>
                {f.optionLabel ? f.optionLabel(opt) : opt}
              </option>
            ))}
          </select>
          {f.helperLink && (
            <a className="field-helper-link" href={f.helperLink.href} target="_blank" rel="noreferrer noopener">
              {f.helperLink.label} →
            </a>
          )}
        </div>
      );
    }
    // segmented
    return (
      <div className="field" key={f.key}>
        <label>{f.label}</label>
        <div className="pill-group">
          {f.options!.map((opt) => (
            <button type="button" key={opt} className={"pill" + (raw === opt ? " selected" : "")} onClick={() => setField(f.key, opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <LogoMark />Wavelength
        </div>
        <p className="sidebar-tagline">A few honest details, so the people you work with don&apos;t have to guess.</p>
        {supabaseEnabled && (
          <div className="auth-nav">
            {authUser ? (
              <>
                <span className="auth-nav-email">{authUser.email}</span>
                <button type="button" className="auth-nav-link" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <button type="button" className="auth-nav-link" onClick={openSignIn}>Sign in to save your progress</button>
            )}
          </div>
        )}
        <Link className="nav-home-link" href={authUser ? "/dashboard" : "/"}>← Back to home</Link>
        {STEPS.map((s, i) => (
          <button
            type="button"
            key={s.id}
            className={"nav-item" + (i === stepIndex ? " active" : "") + (i < stepIndex ? " done" : "")}
            onClick={() => goTo(i)}
          >
            <span className="nav-dot" />
            {s.kind === "review" ? "Your Manual" : s.title}
          </button>
        ))}
      </aside>
      <main className="main">
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progressPct}%` }} /></div>

        {isForm ? (
          <div className="card">
            <h1 className="step-title">{stepDef.title}</h1>
            <p className="step-subtitle">{stepDef.subtitle}</p>
            {stepDef.fields!.map(renderField)}
          </div>
        ) : (
          <div className="card review-card">
            <div className="print-letterhead">
              <div className="print-letterhead-brand"><LogoMark />Wavelength</div>
              <div className="print-letterhead-meta">Personal Working Manual &middot; {printDateString()}</div>
            </div>
            <h1 className="step-title" style={{ marginTop: 8 }}>{docTitle}</h1>
            <div className="pill-group" style={{ marginBottom: 30, marginTop: 22 }}>
              <button type="button" className={"pill" + (exportView === "detailed" ? " selected" : "")} onClick={() => setExportView("detailed")}>Detailed</button>
              <button type="button" className={"pill" + (exportView === "onepager" ? " selected" : "")} onClick={() => setExportView("onepager")}>One-pager</button>
            </div>
            <ManualBody values={values} mode={exportView} />
            <div className="print-footer">Prepared with Wavelength</div>
            <div className="review-actions">
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setValues({}); goTo(0); }}>Start over</button>
            </div>
          </div>
        )}

        {!isReview && (
          <div className="nav-buttons">
            <div className="nav-left">
              {stepIndex > 0 && <button type="button" className="btn btn-secondary" onClick={() => goTo(stepIndex - 1)}>Back</button>}
            </div>
            <div className="nav-right">
              <button type="button" className="btn btn-primary" onClick={() => goTo(stepIndex + 1)}>{nextLabel}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
