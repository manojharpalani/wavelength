"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { Avatar } from "@/components/Avatar";
import { MbtiBadge } from "@/components/MbtiBadge";
import { ManualBody } from "@/components/ManualBody";
import { useMyManual } from "@/lib/hooks/useMyManual";
import { MBTI_TYPES, isFilled, printDateString } from "@/lib/manual/data";

// Read-only "My Manual" view — the profile page for your own manual. A
// small "Edit basics" disclosure lets you fix name/role/MBTI without
// entering the full step-by-step wizard; "Edit full manual" goes there
// for everything else.
export default function MyManualPage() {
  const { values, setField, loaded } = useMyManual();
  const [mode, setMode] = useState<"detailed" | "onepager">("detailed");
  const [editingBasics, setEditingBasics] = useState(false);

  if (!loaded) return <p className="empty-state">Loading your manual…</p>;

  return (
    <div className="teams-hub">
      <div className="profile-header">
        <Avatar name={values.name} size="lg" />
        <div>
          <h1 className="step-title" style={{ marginBottom: 4 }}>{isFilled(values.name) ? values.name.trim() : "Your manual"}</h1>
          <div className="tag-row" style={{ marginTop: 0 }}>
            {isFilled(values.role) && <span className="tag">{values.role}</span>}
            {isFilled(values.mbtiType) && <MbtiBadge code={values.mbtiType} variant="compact" />}
          </div>
        </div>
      </div>

      <div className="quick-edit-disclosure">
        <button type="button" className="btn btn-ghost" onClick={() => setEditingBasics((v) => !v)}>
          {editingBasics ? "Done editing basics" : "Edit basics"}
        </button>
        {editingBasics && (
          <div className="quick-edit-form">
            <div className="field">
              <label htmlFor="qe-name">Your name</label>
              <input id="qe-name" type="text" value={values.name || ""} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="qe-role">Role</label>
              <input id="qe-role" type="text" value={values.role || ""} onChange={(e) => setField("role", e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="qe-mbti">Myers-Briggs type</label>
              <select id="qe-mbti" value={values.mbtiType || ""} onChange={(e) => setField("mbtiType", e.target.value)}>
                <option value="">Select…</option>
                {MBTI_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>{t.code} — {t.nickname}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card review-card" style={{ maxWidth: "none" }}>
        <div className="print-letterhead">
          <div className="print-letterhead-brand"><LogoMark />Wavelength</div>
          <div className="print-letterhead-meta">Personal Working Manual &middot; {printDateString()}</div>
        </div>
        <div className="pill-group" style={{ marginBottom: 26 }}>
          <button type="button" className={"pill" + (mode === "detailed" ? " selected" : "")} onClick={() => setMode("detailed")}>Detailed</button>
          <button type="button" className={"pill" + (mode === "onepager" ? " selected" : "")} onClick={() => setMode("onepager")}>One-pager</button>
        </div>
        <ManualBody values={values} mode={mode} />
        <div className="print-footer">Prepared with Wavelength</div>
        <div className="review-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
          <Link href="/manual/edit" className="btn btn-primary">Edit full manual</Link>
        </div>
      </div>
    </div>
  );
}
