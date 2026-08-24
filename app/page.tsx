"use client";

import { useEffect, useRef, useState } from "react";

// ---------- content model (ported from the static prototype) ----------

type FieldKind = "text" | "textarea" | "tags" | "segmented";

interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[];
}

interface StepDef {
  id: string;
  kind: "form" | "review";
  title?: string;
  subtitle?: string;
  fields?: FieldDef[];
}

const STEPS: StepDef[] = [
  {
    id: "about",
    kind: "form",
    title: "About You",
    subtitle: "The basics — who you are and what you bring.",
    fields: [
      { key: "name", label: "Your name", kind: "text", placeholder: "e.g. Jordan Lee" },
      { key: "role", label: "Role", kind: "text", placeholder: "e.g. Senior Product Designer" },
      { key: "experience", label: "Background", kind: "text", placeholder: "e.g. 8 years in product design, 3 leading a team" },
      { key: "knownFor", label: "What people can count on you for", kind: "textarea", placeholder: "e.g. Turning messy problems into clear plans, and following through." },
      { key: "careAbout", label: "What you care about in your work", kind: "textarea", placeholder: "e.g. Craft, honest feedback, and making the team look good." },
    ],
  },
  {
    id: "communicate",
    kind: "form",
    title: "How You Communicate",
    subtitle: "Knowing this up front saves everyone the guesswork.",
    fields: [
      { key: "quickChannel", label: "Best channel for quick things", kind: "text", placeholder: "e.g. Slack" },
      { key: "complexChannel", label: "Best channel for anything complex or sensitive", kind: "text", placeholder: "e.g. A scheduled call" },
      { key: "responseTime", label: "Response time people can expect", kind: "text", placeholder: "e.g. Within a few hours, longer on deep-focus days" },
      { key: "directness", label: "How you like things said", kind: "segmented", options: ["Say it straight", "Ease into it", "Somewhere in between"] },
      { key: "processingStyle", label: "How you process best", kind: "textarea", placeholder: "e.g. I like a minute to think before answering something complex — writing helps me organize my thoughts." },
    ],
  },
  {
    id: "workstyle",
    kind: "form",
    title: "How You Work",
    subtitle: "The conditions that bring out your best, and what gets in the way.",
    fields: [
      { key: "decisionStyle", label: "How you make decisions", kind: "textarea", placeholder: "e.g. I weigh the data, but I trust my gut when time is short." },
      { key: "bestFocusConditions", label: "When you are at your best", kind: "textarea", placeholder: "e.g. Mornings, with a clear block of uninterrupted time." },
      { key: "focusBreakers", label: "What throws off your focus", kind: "textarea", placeholder: "e.g. Back-to-back meetings with no breaks between them." },
      { key: "headsUp", label: "A heads-up you appreciate", kind: "textarea", placeholder: "e.g. Send an agenda before you grab time with me." },
    ],
  },
  {
    id: "feedback",
    kind: "form",
    title: "Feedback & Support",
    subtitle: "What helps feedback actually land, and what helps you do great work.",
    fields: [
      { key: "feedbackReceive", label: "How you like feedback delivered", kind: "textarea", placeholder: "e.g. Directly and early — I would rather hear it now than later." },
      { key: "feedbackGive", label: "How you tend to give feedback", kind: "textarea", placeholder: "e.g. The same way — direct, but kind." },
      { key: "recognition", label: "What recognition actually lands for you", kind: "textarea", placeholder: "e.g. Specific, concrete callouts beat general praise." },
      { key: "whatHelps", label: "What helps you do your best work", kind: "textarea", placeholder: "e.g. Clear priorities, room to think, and trust to run with things." },
    ],
  },
  {
    id: "values",
    kind: "form",
    title: "Values & Expectations",
    subtitle: "What matters to you, and what you hope for from the people around you.",
    fields: [
      { key: "valueTeam", label: "What you value in a team", kind: "textarea", placeholder: "e.g. Honesty, and a shared bar for quality." },
      { key: "valuePeople", label: "What you value in the people you work with", kind: "textarea", placeholder: "e.g. Curiosity, and following through on commitments." },
      { key: "expectations", label: "What you expect from teammates", kind: "textarea", placeholder: "e.g. Tell me early if something is off track." },
    ],
  },
  {
    id: "strengths",
    kind: "form",
    title: "Strengths & Growth",
    subtitle: "A quick, honest picture, not a highlight reel.",
    fields: [
      { key: "strengths", label: "Your key strengths", kind: "tags", placeholder: "e.g. Meticulous, calm under pressure, a good listener (separate with commas)" },
      { key: "growingIn", label: "What you are actively working on", kind: "textarea", placeholder: "e.g. Speaking up sooner in big group settings." },
    ],
  },
  {
    id: "extras",
    kind: "form",
    title: "A Few More Things",
    subtitle: "The small details that make working together smoother.",
    fields: [
      { key: "frictionApproach", label: "If there is friction, the best way to raise it with you", kind: "textarea", placeholder: "e.g. Tell me directly and early — I would rather know." },
      { key: "funFacts", label: "Fun facts about you", kind: "textarea", placeholder: "e.g. I make a mean sourdough, and I once ran a marathon on a dare." },
    ],
  },
  { id: "review", kind: "review" },
];

const REVIEW_GROUPS: { heading: string; rows: { key: string; label: string }[] }[] = [
  {
    heading: "About Me",
    rows: [
      { key: "role", label: "Role" },
      { key: "experience", label: "Background" },
      { key: "knownFor", label: "What people can count on me for" },
      { key: "careAbout", label: "What I care about" },
    ],
  },
  {
    heading: "How I Communicate",
    rows: [
      { key: "quickChannel", label: "Best channel for quick things" },
      { key: "complexChannel", label: "Best channel for anything complex or sensitive" },
      { key: "responseTime", label: "Response time" },
      { key: "directness", label: "How I like things said" },
      { key: "processingStyle", label: "How I process best" },
    ],
  },
  {
    heading: "How I Work",
    rows: [
      { key: "decisionStyle", label: "How I make decisions" },
      { key: "bestFocusConditions", label: "When I am at my best" },
      { key: "focusBreakers", label: "What throws off my focus" },
      { key: "headsUp", label: "A heads-up I appreciate" },
    ],
  },
  {
    heading: "Feedback & Support",
    rows: [
      { key: "feedbackReceive", label: "How I like feedback delivered" },
      { key: "feedbackGive", label: "How I tend to give feedback" },
      { key: "recognition", label: "What recognition actually lands for me" },
      { key: "whatHelps", label: "What helps me do my best work" },
    ],
  },
  {
    heading: "Values & Expectations",
    rows: [
      { key: "valueTeam", label: "What I value in a team" },
      { key: "valuePeople", label: "What I value in the people I work with" },
      { key: "expectations", label: "What I expect from teammates" },
    ],
  },
  { heading: "Growth", rows: [{ key: "growingIn", label: "What I am actively working on" }] },
  {
    heading: "A Few More Things",
    rows: [
      { key: "frictionApproach", label: "If there is friction, the best way to raise it with me" },
      { key: "funFacts", label: "Fun facts about me" },
    ],
  },
];

const ONEPAGER_QUICKFACTS = [
  { key: "quickChannel", label: "Best via" },
  { key: "responseTime", label: "Reply time" },
  { key: "directness", label: "Style" },
];

const ONEPAGER_ESSENTIALS = [
  { key: "knownFor", label: "Known for" },
  { key: "whatHelps", label: "Do this and I'll thrive" },
  { key: "feedbackReceive", label: "Feedback that works" },
  { key: "frictionApproach", label: "If something's off" },
];

type Values = Record<string, string>;

function isFilled(s: string | undefined) {
  return !!(s && s.trim().length > 0);
}

function deriveTags(raw: string | undefined) {
  return (raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function buildDetailedSections(values: Values) {
  return REVIEW_GROUPS.map((g) => ({
    heading: g.heading,
    items: g.rows.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value)),
  })).filter((g) => g.items.length > 0);
}

function buildOnePagerFacts(values: Values) {
  return ONEPAGER_QUICKFACTS.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value));
}

function buildOnePagerEssentials(values: Values) {
  return ONEPAGER_ESSENTIALS.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value));
}

function docTitleFor(values: Values) {
  return isFilled(values.name) ? `Working With ${values.name.trim()}` : "Working With Me";
}

function printDateString() {
  try {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

const SAMPLE_VALUES: Values = {
  name: "Amara Chen",
  role: "Senior Backend Engineer, Payments Platform",
  experience: "9 years building distributed systems, 2 years mentoring junior engineers",
  knownFor: "Turning vague requirements into a clear technical plan, and catching edge cases before they become incidents.",
  careAbout: "Reliability, clean interfaces between systems, and making sure on-call isn't miserable.",
  quickChannel: "Slack",
  complexChannel: "A 30-minute call, not a Slack thread",
  responseTime: "Within a few hours during work hours",
  directness: "Say it straight",
  processingStyle: "I think out loud in conversation, but I write better answers when I've had a night to sleep on something complex.",
  decisionStyle: "I look for data first, but I won't let analysis paralysis block a call that needs to be made this week.",
  bestFocusConditions: "Early mornings, before the first meeting, headphones on.",
  focusBreakers: "A calendar with no gaps between meetings.",
  headsUp: "Send the doc before the meeting — I read faster than I listen.",
  feedbackReceive: "Directly, and as close to the moment as possible.",
  feedbackGive: "Same — I'd rather say it now than let it become a pattern.",
  recognition: "A specific line about what worked means more to me than a general 'great job.'",
  whatHelps: "Clear ownership boundaries, and space to go deep on one hard problem instead of ten shallow ones.",
  valueTeam: "A team that argues about ideas, not people.",
  valuePeople: "People who follow through without needing to be chased.",
  expectations: "Flag risk early, even if you're not sure yet it's a real problem.",
  strengths: "Meticulous, calm under pressure, direct, a strong mentor, good at simplifying complexity",
  growingIn: "Delegating the fun problems instead of keeping them for myself.",
  frictionApproach: "Tell me straight, sooner rather than later — I'd rather fix it than keep guessing.",
  funFacts: "Rebuilds vintage synthesizers on weekends, and once debugged a production incident from a campsite with one bar of signal.",
};

// ---------- small components ----------

function LogoMark({ className = "logo-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12c1.4-4.2 2.8-6.3 4.3-6.3s2.9 8.6 4.4 8.6 2.9-6.3 4.4-6.3 2.6 3.7 4.1 3.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          height: string;
          width: string;
          videoId: string;
          playerVars: Record<string, number>;
          events: {
            onReady: () => void;
            onStateChange: (e: { data: number }) => void;
          };
        }
      ) => { playVideo: () => void; pauseVideo: () => void };
    };
  }
}

function AudioToggle() {
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ playVideo: () => void; pauseVideo: () => void } | null>(null);

  useEffect(() => {
    function createPlayer() {
      if (!containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: "2",
        width: "2",
        videoId: "7jfMnh9c_d4",
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: () => playerRef.current?.playVideo(),
          onStateChange: (e) => setPlaying(e.data === 1),
        },
      });
    }

    if (window.YT) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        createPlayer();
      };
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    }
  }, []);

  return (
    <>
      <button
        type="button"
        className="audio-toggle"
        aria-label={playing ? "Pause background music" : "Play background music"}
        onClick={() => {
          if (!playerRef.current) return;
          if (playing) playerRef.current.pauseVideo();
          else playerRef.current.playVideo();
        }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="currentColor" /><rect x="14" y="5" width="4" height="14" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        )}
      </button>
      <div style={{ position: "fixed", left: "-9999px", top: "-9999px", width: 2, height: 2, overflow: "hidden" }}>
        <div ref={containerRef} />
      </div>
    </>
  );
}

interface AssistState {
  loading: boolean;
  error?: string;
}

function AssistButton({
  state,
  onClick,
}: {
  state: AssistState | undefined;
  onClick: () => void;
}) {
  return (
    <button type="button" className="assist-btn" disabled={state?.loading} onClick={onClick}>
      {state?.loading ? (
        <>
          <span className="assist-spinner" /> Polishing…
        </>
      ) : (
        <>✨ Help me write this</>
      )}
    </button>
  );
}

function ManualBody({ values, mode }: { values: Values; mode: "detailed" | "onepager" }) {
  const sections = buildDetailedSections(values);
  const quickFacts = buildOnePagerFacts(values);
  const essentials = buildOnePagerEssentials(values);
  const tags = deriveTags(values.strengths);
  const hasTags = tags.length > 0;
  const hasContent = mode === "onepager" ? quickFacts.length > 0 || essentials.length > 0 || hasTags : sections.length > 0 || hasTags;

  if (!hasContent) {
    return <p className="empty-state">Nothing here yet — jump into any section on the left and add a few details to see your manual take shape.</p>;
  }

  return (
    <>
      {mode === "onepager" ? (
        <>
          <ReviewSection heading="Quick facts" rows={quickFacts} />
          <ReviewSection heading="The essentials" rows={essentials} />
        </>
      ) : (
        sections.map((s) => <ReviewSection key={s.heading} heading={s.heading} rows={s.items} />)
      )}
      {hasTags && (
        <div className="review-section">
          <h3 className="review-heading">Strengths</h3>
          <div className="tag-row">
            {tags.map((t) => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ReviewSection({ heading, rows }: { heading: string; rows: { label: string; value?: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="review-section">
      <h3 className="review-heading">{heading}</h3>
      {rows.map((item) => (
        <div className="review-row" key={item.label}>
          <div className="review-label">{item.label}</div>
          <div className="review-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- main app ----------

export default function Home() {
  const [view, setView] = useState<"home" | "wizard">("home");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [exportView, setExportView] = useState<"detailed" | "onepager">("detailed");
  const [previewOpen, setPreviewOpen] = useState<"onepager" | "detailed" | null>(null);
  const [assist, setAssist] = useState<Record<string, AssistState>>({});

  const hasStarted = step > 0 || Object.values(values).some(isFilled);
  const ctaLabel = hasStarted ? "Pick up where you left off" : "Find your wavelength";

  function setField(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function goTo(i: number) {
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
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
      setValues((v) => ({ ...v, [fieldKey]: data.text }));
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
    // segmented
    return (
      <div className="field" key={f.key}>
        <label>{f.label}</label>
        <div className="pill-group">
          {f.options!.map((opt) => (
            <button
              type="button"
              key={opt}
              className={"pill" + (raw === opt ? " selected" : "")}
              onClick={() => setField(f.key, opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderHome() {
    return (
      <div className="home">
        <div className="home-nav">
          <div className="home-brand">
            <LogoMark />
            <span className="home-wordmark">Wavelength</span>
            <AudioToggle />
          </div>
        </div>

        <section className="hero">
          <span className="kicker">Because nobody comes with instructions</span>
          <h1 className="hero-title">Get on the same wavelength, faster.</h1>
          <p className="hero-subtitle">
            We&apos;re all a little different, and that&apos;s the whole point. A few honest answers turn into something people can actually
            use — how you think, what helps you thrive, what throws you off. Share it, and the guesswork just melts away.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setView("wizard")}>{ctaLabel}</button>
            <span className="hero-time-note">Five minutes, no small talk required</span>
          </div>
          <div className="hero-visual">
            <svg className="hero-visual-svg" viewBox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="120" cy="110" r="10" style={{ fill: "var(--accent)" }} />
              <circle cx="120" cy="110" r="34" className="ring ring-a" style={{ stroke: "var(--accent)" }} />
              <circle cx="120" cy="110" r="58" className="ring ring-b" style={{ stroke: "var(--accent)" }} />
              <circle cx="120" cy="110" r="82" className="ring ring-c" style={{ stroke: "var(--accent)" }} />
              <circle cx="360" cy="110" r="10" fill="#8f887c" />
              <circle cx="360" cy="110" r="34" className="ring ring-a" stroke="#8f887c" />
              <circle cx="360" cy="110" r="58" className="ring ring-b" stroke="#8f887c" />
              <circle cx="360" cy="110" r="82" className="ring ring-c" stroke="#8f887c" />
              <circle cx="240" cy="110" r="4.5" style={{ fill: "var(--accent)" }} />
              <circle cx="240" cy="82" r="3" style={{ fill: "var(--accent)" }} opacity="0.6" />
              <circle cx="240" cy="138" r="3" style={{ fill: "var(--accent)" }} opacity="0.6" />
            </svg>
          </div>
        </section>

        <section className="vision-section">
          <span className="section-eyebrow">Why this, why now</span>
          <p className="vision-statement">
            AI can write your emails. It can&apos;t make you <span style={{ color: "var(--accent)" }}>understood</span>.
          </p>
          <p className="vision-support">
            The more we lean on machines to talk for us, the easier it is to forget how to talk to each other. Wavelength is a small,
            human counter-move — a few honest words, in your own voice, so the people around you don&apos;t need an algorithm to know how
            to work with you.
          </p>
        </section>

        <section className="home-section">
          <span className="section-eyebrow">The stuff nobody says out loud</span>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.6" /><path d="M8 12.3l2.6 2.6L16 9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h3>Less friction</h3>
              <p>No more re-explaining yourself to every new teammate like it&apos;s your first day, forever.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6.5" strokeWidth="1.6" /><circle cx="15" cy="12" r="6.5" strokeWidth="1.6" /></svg></div>
              <h3>Faster trust</h3>
              <p>New teammates (and new managers) actually get you in minutes, not months.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M5.5 15.5a9 9 0 0 1 13 0" strokeWidth="1.6" strokeLinecap="round" /><path d="M8.3 18a5 5 0 0 1 7.4 0" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="20" r="1.1" stroke="none" fill="currentColor" /></svg></div>
              <h3>Fewer crossed wires</h3>
              <p>The quiet little misreads that build into real friction? Gone before they start.</p>
            </div>
          </div>
        </section>

        <section className="home-section">
          <span className="section-eyebrow">How it works</span>
          <div className="how-grid">
            <div className="how-step"><span className="how-number">1</span><h3>Answer like you mean it</h3><p>Seven short sections. No wrong answers — just the true ones.</p></div>
            <div className="how-step"><span className="how-number">2</span><h3>Watch yourself take shape</h3><p>It comes together right in front of you — the quick version and the whole story, side by side.</p></div>
            <div className="how-step"><span className="how-number">3</span><h3>Let it do the talking</h3><p>Drop it in a doc, print it, or just send the link — however it lands, it starts working for you.</p></div>
          </div>
        </section>

        <section className="home-section">
          <span className="section-eyebrow">Not sure what to say yet?</span>
          <p className="section-body">That&apos;s normal — most people freeze up on a blank page. Here&apos;s what it looks like once someone else has already opened up.</p>
          <div className="samples-row">
            <div className="sample-card">
              <h3>One-pager</h3>
              <p>The quick read — the handful of things someone should know before they even say hello.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen("onepager")}>Preview the one-pager</button>
            </div>
            <div className="sample-card">
              <h3>Detailed version</h3>
              <p>The whole story — for the new manager, the closest collaborators, or anyone who wants to really get you.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewOpen("detailed")}>Preview the detailed version</button>
            </div>
          </div>
        </section>

        <section className="home-footer">
          <h2 className="footer-title">Your people are waiting to actually get you.</h2>
          <button type="button" className="btn btn-primary" onClick={() => setView("wizard")}>{ctaLabel}</button>
        </section>
      </div>
    );
  }

  function renderWizard() {
    const stepIndex = step;
    const stepDef = STEPS[stepIndex];
    const total = STEPS.length;
    const formStepCount = total - 1;
    const isReview = stepDef.kind === "review";
    const isForm = stepDef.kind === "form";
    const progressPct = isReview ? 100 : Math.round((stepIndex / formStepCount) * 100);
    const lastFormIndex = formStepCount - 1;
    const nextLabel = stepIndex === lastFormIndex ? "Review my manual" : "Next";
    const docTitle = docTitleFor(values);
    const mode = exportView;

    return (
      <>
        <aside className="sidebar">
          <p className="sidebar-brand">
            <LogoMark />Wavelength<AudioToggle />
          </p>
          <p className="sidebar-tagline">A few honest details, so the people you work with don&apos;t have to guess.</p>
          <button type="button" className="nav-home-link" onClick={() => setView("home")}>← Back to home</button>
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
                <button type="button" className={"pill" + (mode === "detailed" ? " selected" : "")} onClick={() => setExportView("detailed")}>Detailed</button>
                <button type="button" className={"pill" + (mode === "onepager" ? " selected" : "")} onClick={() => setExportView("onepager")}>One-pager</button>
              </div>
              <ManualBody values={values} mode={mode} />
              <div className="print-footer">Prepared with Wavelength</div>
              <div className="review-actions">
                <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
                <button type="button" className="btn btn-ghost" onClick={() => { setStep(0); setValues({}); }}>Start over</button>
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
      </>
    );
  }

  function renderModal() {
    if (!previewOpen) return null;
    const label = previewOpen === "onepager" ? "A sample: the quick read" : "A sample: the whole story";
    const title = docTitleFor(SAMPLE_VALUES);
    return (
      <div className="preview-backdrop" onClick={() => setPreviewOpen(null)}>
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="preview-modal-head">
            <span className="kicker">{label}</span>
            <button type="button" className="btn btn-ghost close-btn" onClick={() => setPreviewOpen(null)}>Close</button>
          </div>
          <h2 className="step-title" style={{ fontSize: 26 }}>{title}</h2>
          <p className="step-subtitle" style={{ marginBottom: 24 }}>Just a glimpse of what&apos;s possible — your own words will live here soon enough.</p>
          <ManualBody values={SAMPLE_VALUES} mode={previewOpen} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === "home" ? renderHome() : renderWizard()}
      {renderModal()}
    </div>
  );
}
