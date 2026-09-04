"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
      { key: "mbtiType", label: "Myers-Briggs type (optional)", kind: "text", placeholder: "e.g. INTJ — don't know it? skip this, or look it up at 16personalities.com" },
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
    heading: "Personality",
    rows: [{ key: "mbtiType", label: "Myers-Briggs type" }],
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
  name: "Manoj Harpalani",
  role: "Engineering Leader",
  experience: "17 years of experience building large-scale software systems, and 8+ years leading high-performing teams across full-stack consumer products and platforms, spanning big tech, growth-stage, and startups.",
  knownFor: "Building high-performing teams, fostering innovation, and delivering scalable, reliable systems — with a reputation for being meticulous, methodical, and someone people can count on.",
  careAbout: "Solving complex problems, mentoring engineers, and driving business impact through technology.\nDiving into software design and architecture, and anything that challenges me intellectually.",
  quickChannel: "Slack",
  complexChannel: "Scheduled 1:1s",
  responseTime: "Usually within a few hours; may take longer if I'm deep in focused work.",
  directness: "Say it straight",
  processingStyle: "I appreciate context before diving into problem-solving — set the stage before sharing details. I do my best thinking with a little processing time, especially in fast-moving verbal discussions, so a written follow-up often gets a sharper answer from me than an on-the-spot one. I sometimes give the full context before arriving at the headline — if you need the bottom line fast, just ask and I'll lead with it.",
  decisionStyle: "I balance data, intuition, and team input.\nI lean toward collaboration when a decision affects multiple stakeholders, but I can be decisive quickly when the moment calls for it.\nI always prioritize long-term impact and alignment with team and company goals over short-term convenience.",
  bestFocusConditions: "Mornings — I dedicate them to focused work and keep afternoons for meetings (typical hours: 9 AM–5 PM).",
  focusBreakers: "A fragmented calendar, or being pulled into something with no advance notice.",
  headsUp: "I'm protective of my calendar — if you need time with me, send a clear agenda so I can prepare.\nI can lose track of time when I'm deeply absorbed in a problem, so a direct nudge if we need to move on is always welcome.",
  feedbackReceive: "Share it early and directly — I'd rather hear it plainly and sooner than have it wait. I treat feedback as how we grow, not as something to soften too much.",
  feedbackGive: "The same standard — direct, timely, and constructive.",
  recognition: "Specific, concrete feedback lands better than general praise. I can be quick to underestimate my own work even when the results are strong, so naming exactly what worked helps it actually register.",
  whatHelps: "Advance context — an agenda or a heads-up before a discussion, rather than being dropped into it cold.\nDirectness, said plainly rather than hinted at.\nA little space to process before responding on complex topics.\nSpecific, concrete feedback rather than general praise.",
  valueTeam: "Collaboration and mutual respect.\nA culture of learning, experimentation, and continuous improvement.\nOwnership and accountability — empowerment drives results.",
  valuePeople: "A growth mindset — willingness to learn, adapt, and take on challenges.\nProactive communication and transparency.\nEmpathy, and the ability to see beyond individual contributions to the bigger picture.\nTaking people at face value and assuming good intent.",
  expectations: "Honesty — share problems early, I'd rather hear bad news sooner.\nPreparedness — come to 1:1s and discussions with clear goals or questions.\nOpenness to giving and receiving constructive feedback.\nInitiative — if you see something broken, propose a solution or at least surface it.",
  strengths: "Meticulous, methodical, strong work ethic, dedicated and focused, a go-getter, close attention to detail, humble, down-to-earth, honest, loyal, kind, understanding, forgiving",
  growingIn: "Improving my storytelling skills for clearer, more engaging communication.\nPracticing mindful, service-first leadership that balances team needs and business priorities.\nDeepening my technical knowledge to stay current with evolving trends.",
  frictionApproach: "Tell me directly and early — I'd rather address it than have it linger.\nIf I seem heads-down or overly serious, it's almost always focus, not distance — a quick, direct check-in is always welcome.",
  funFacts: "Father of two boys — a third grader and a kindergartner — and family time usually wins over everything else on weekends.\nAlso convinced a good cup of chai can fix most Monday mornings.",
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
        videoId: "fIgfO9gD5GY",
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
  label = "Help me write this",
  loadingLabel = "Polishing…",
}: {
  state: AssistState | undefined;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button type="button" className="assist-btn" disabled={state?.loading} onClick={onClick}>
      {state?.loading ? (
        <>
          <span className="assist-spinner" /> {loadingLabel}
        </>
      ) : (
        <>✨ {label}</>
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
    <div className="manual-body">
      {mode === "onepager" ? (
        <>
          <ReviewSection heading="Quick Facts" rows={quickFacts} />
          <ReviewSection heading="The Essentials" rows={essentials} />
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
    </div>
  );
}

function ReviewSection({ heading, rows }: { heading: string; rows: { label: string; value?: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="review-section">
      <h3 className="review-heading">{heading}</h3>
      {rows.map((item) => {
        const points = (item.value || "")
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
        return (
          <div className="review-row" key={item.label}>
            <div className="review-label">{item.label}</div>
            <ul className="review-value review-list">
              {points.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------- main app ----------

type TeamSummary = { id: string; name: string; invite_code: string; joined_at: string; is_owner: boolean };
type RosterRow = { user_id: string; email: string; joined_at: string; has_manual: boolean };

// ---------- team working agreement (Phase 3) ----------

type AgreementQuestion = { key: string; label: string; placeholder: string };

const AGREEMENT_QUESTIONS: AgreementQuestion[] = [
  { key: "communication", label: "How should we communicate day-to-day?", placeholder: "e.g. Slack for anything that can wait an hour; call or huddle for anything urgent." },
  { key: "meetingRhythm", label: "What's our meeting rhythm?", placeholder: "e.g. 15-min standup daily, 1:1s every other week, no-meeting Fridays." },
  { key: "decisionMaking", label: "How do we make decisions as a team?", placeholder: "e.g. Whoever's closest to the work decides; loop in the team for anything hard to reverse." },
  { key: "prReview", label: "What's our standard for reviewing code?", placeholder: "e.g. Same-day review turnaround; small PRs preferred; one approval to merge." },
  { key: "onCall", label: "What do we expect from each other during on-call or urgent issues?", placeholder: "e.g. Acknowledge a page within 15 minutes; escalate if you're stuck for more than 30." },
  { key: "coreHours", label: "What are our core hours and availability norms?", placeholder: "e.g. Overlap 10am-2pm ET; otherwise work when it suits your timezone and focus." },
  { key: "feedbackConflict", label: "How do we want to give feedback and handle disagreement?", placeholder: "e.g. Say it directly and soon, in private first; disagree openly in design reviews, commit once we decide." },
  { key: "definitionOfDone", label: "What does \"done\" mean for our team?", placeholder: "e.g. Tests pass, docs updated, reviewed, and deployed — not just merged." },
];

type AgreementResponseRow = { question_key: string; user_id: string; email: string; answer: string; updated_at: string };
type AgreementDraftRow = { question_key: string; draft_text: string; updated_at: string; updated_by_email: string | null };

// A finished-looking sample, shown in the "View a sample" preview — not
// real team data, just something concrete for a first-time visitor to
// picture their own team filling in.
const SAMPLE_AGREEMENT: Record<string, string> = {
  communication: "We default to async — Slack threads and written docs — and save meetings for things that need real discussion. If something's blocking you, ping the person directly instead of waiting on a channel.",
  meetingRhythm: "A 15-minute standup daily, 1:1s every other week, and no internal meetings on Fridays.",
  decisionMaking: "Whoever's closest to the work decides. For anything hard to reverse, we loop in the team first.",
  prReview: "Same-day review turnaround. Small PRs are strongly preferred. One approval to merge.",
  onCall: "Acknowledge a page within 15 minutes. Escalate if you're stuck for more than 30.",
  coreHours: "Overlap 10am–2pm ET. Outside that, work when it suits your timezone and focus.",
  feedbackConflict: "Say it directly and soon, privately first. Disagree openly in design reviews — once we decide, we commit.",
  definitionOfDone: "Tests pass, docs are updated, it's been reviewed, and it's deployed — not just merged.",
};

export default function Home() {
  const [view, setView] = useState<"home" | "wizard" | "teams" | "team" | "agreement">("home");
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [exportView, setExportView] = useState<"detailed" | "onepager">("detailed");
  const [previewOpen, setPreviewOpen] = useState<"onepager" | "detailed" | "agreement" | null>(null);
  const [assist, setAssist] = useState<Record<string, AssistState>>({});

  const supabaseEnabled = isSupabaseConfigured();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [manualLoaded, setManualLoaded] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authState, setAuthState] = useState<{ sending: boolean; sent: boolean; error?: string }>({ sending: false, sent: false });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [myTeams, setMyTeams] = useState<TeamSummary[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [activeTeam, setActiveTeam] = useState<TeamSummary | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [createTeamState, setCreateTeamState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinState, setJoinState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [pendingInvite, setPendingInvite] = useState<{ code: string; teamName: string | null; checked: boolean } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");
  const [renameState, setRenameState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [teamActionState, setTeamActionState] = useState<{ loading: boolean; error?: string }>({ loading: false });
  const [teammateManual, setTeammateManual] = useState<{ email: string; values: Values; mode: "onepager" | "detailed" } | null>(null);
  const [teammateManualLoading, setTeammateManualLoading] = useState(false);
  const [teammateManualError, setTeammateManualError] = useState<string | undefined>(undefined);

  const [agreementTab, setAgreementTab] = useState<"respond" | "compare" | "draft">("respond");
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [myResponses, setMyResponses] = useState<Record<string, string>>({});
  const [agreementResponses, setAgreementResponses] = useState<AgreementResponseRow[]>([]);
  const [agreementDraft, setAgreementDraft] = useState<Record<string, string>>({});
  const [agreementStatus, setAgreementStatus] = useState<{ finalizedAt: string | null; finalizedByEmail: string | null }>({ finalizedAt: null, finalizedByEmail: null });
  const [synthesis, setSynthesis] = useState<Record<string, AssistState>>({});
  const responseSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const draftSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const hasStarted = step > 0 || Object.values(values).some(isFilled);
  const ctaLabel = hasStarted ? "Pick up where you left off" : "Find your wavelength";

  // Pick up a ?join=CODE invite link on first load (including the one
  // /join/[code] forwards to) and surface it on the Teams hub.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("join");
    if (code) {
      setPendingInvite({ code, teamName: null, checked: false });
      setView("teams");
    }
  }, []);

  // Preview the invited team's name — works even signed out (the RPC is
  // granted to anon too) so a link can say "join <team>" before sign-in.
  useEffect(() => {
    if (!pendingInvite || pendingInvite.checked) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setPendingInvite((p) => (p ? { ...p, checked: true } : p));
      return;
    }
    supabase
      .rpc("get_team_by_invite_code", { p_code: pendingInvite.code })
      .then(({ data }) => {
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string }) : null;
        setPendingInvite((p) => (p ? { ...p, teamName: row?.name ?? null, checked: true } : p));
      });
  }, [pendingInvite]);

  // Load "my teams" whenever sign-in state changes.
  useEffect(() => {
    if (!authUser) {
      setMyTeams([]);
      setTeamsLoaded(false);
      return;
    }
    loadMyTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  // Watch auth state (no-ops entirely when Supabase isn't configured).
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) setManualLoaded(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign-in, pull the saved manual — but only if there's nothing typed
  // locally yet, so we never clobber an in-progress anonymous draft.
  useEffect(() => {
    if (!authUser) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from("personal_manuals")
      .select("values")
      .eq("user_id", authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const saved = (data?.values as Values) || {};
        setValues((current) => (Object.values(current).some(isFilled) ? current : saved));
        setManualLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // Debounced autosave once signed in and the initial load has settled.
  useEffect(() => {
    if (!authUser || !manualLoaded) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("personal_manuals")
        .upsert({ user_id: authUser.id, values, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error("Wavelength: autosave failed", error);
        });
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, authUser, manualLoaded]);

  async function sendMagicLink() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const email = authEmail.trim();
    if (!email) {
      setAuthState({ sending: false, sent: false, error: "Enter your email first." });
      return;
    }
    setAuthState({ sending: true, sent: false });
    // Preserve the current path/query (e.g. ?join=CODE) so a sign-in
    // triggered from an invite link lands back on that invite after the
    // magic-link round trip.
    const next = window.location.pathname + window.location.search;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setAuthState({ sending: false, sent: false, error: error.message });
    else setAuthState({ sending: false, sent: true });
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthUser(null);
    setManualLoaded(false);
    setMyTeams([]);
    setTeamsLoaded(false);
    setActiveTeam(null);
    setMyResponses({});
    setAgreementResponses([]);
    setAgreementDraft({});
    setAgreementStatus({ finalizedAt: null, finalizedByEmail: null });
  }

  async function loadMyTeams() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_my_teams");
    if (!error) setMyTeams((data as TeamSummary[]) || []);
    setTeamsLoaded(true);
  }

  async function openTeam(team: TeamSummary) {
    setActiveTeam(team);
    setView("team");
    setRoster([]);
    setRosterLoading(true);
    setRenaming(false);
    setConfirmingLeave(false);
    setConfirmingDelete(false);
    setTeamActionState({ loading: false });
    // Also pull the agreement's status so the "Team Working Agreement" card
    // can show where things stand without making someone click into it.
    loadAgreementData(team.id);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRosterLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_team_roster", { p_team_id: team.id });
    if (!error) setRoster((data as RosterRow[]) || []);
    setRosterLoading(false);
  }

  async function createTeam() {
    const name = newTeamName.trim();
    if (!name) {
      setCreateTeamState({ loading: false, error: "Give the team a name." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setCreateTeamState({ loading: true });
    const { data, error } = await supabase.rpc("create_team", { p_name: name });
    if (error) {
      setCreateTeamState({ loading: false, error: error.message });
      return;
    }
    setCreateTeamState({ loading: false });
    setNewTeamName("");
    await loadMyTeams();
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string; invite_code: string }) : null;
    if (row) {
      openTeam({ id: row.id, name: row.name, invite_code: row.invite_code, joined_at: new Date().toISOString(), is_owner: true });
    }
  }

  async function joinByCode(rawCode: string, fromPendingInvite = false) {
    const code = rawCode.trim();
    if (!code) {
      setJoinState({ loading: false, error: "Enter an invite code." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setJoinState({ loading: true });
    const { data, error } = await supabase.rpc("join_team_by_code", { p_code: code });
    if (error) {
      setJoinState({ loading: false, error: error.message });
      return;
    }
    setJoinState({ loading: false, error: undefined });
    setJoinCodeInput("");
    if (fromPendingInvite) {
      setPendingInvite(null);
      window.history.replaceState({}, "", "/");
    }
    await loadMyTeams();
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as { id: string; name: string }) : null;
    if (row) {
      openTeam({ id: row.id, name: row.name, invite_code: code, joined_at: new Date().toISOString(), is_owner: false });
    } else {
      setView("teams");
    }
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context)
      // — the invite URL is still shown in a selectable input either way.
    }
  }

  async function viewTeammateManual(m: RosterRow) {
    if (!activeTeam) return;
    setTeammateManualLoading(true);
    setTeammateManualError(undefined);
    setTeammateManual({ email: m.email, values: {}, mode: "onepager" });
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setTeammateManualLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_team_member_manual", { p_team_id: activeTeam.id, p_user_id: m.user_id });
    const row = Array.isArray(data) && data.length > 0 ? (data[0] as { manual_values: Values }) : null;
    if (error || !row) {
      console.error("Wavelength: loading teammate manual failed", error);
      setTeammateManualError("Couldn't load this manual right now — try again in a moment.");
    } else {
      setTeammateManual({ email: m.email, values: row.manual_values || {}, mode: "onepager" });
    }
    setTeammateManualLoading(false);
  }

  async function saveTeamRename() {
    if (!activeTeam) return;
    const name = renameInput.trim();
    if (!name) {
      setRenameState({ loading: false, error: "Give the team a name." });
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setRenameState({ loading: true });
    const { error } = await supabase.rpc("rename_team", { p_team_id: activeTeam.id, p_name: name });
    if (error) {
      setRenameState({ loading: false, error: error.message });
      return;
    }
    setRenameState({ loading: false });
    setRenaming(false);
    setActiveTeam((t) => (t ? { ...t, name } : t));
    setMyTeams((teams) => teams.map((t) => (t.id === activeTeam.id ? { ...t, name } : t)));
  }

  async function leaveActiveTeam() {
    if (!activeTeam) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setTeamActionState({ loading: true });
    const { error } = await supabase.rpc("leave_team", { p_team_id: activeTeam.id });
    if (error) {
      setTeamActionState({ loading: false, error: error.message });
      return;
    }
    setTeamActionState({ loading: false });
    setActiveTeam(null);
    await loadMyTeams();
    setView("teams");
  }

  async function deleteActiveTeam() {
    if (!activeTeam) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setTeamActionState({ loading: true });
    const { error } = await supabase.rpc("delete_team", { p_team_id: activeTeam.id });
    if (error) {
      setTeamActionState({ loading: false, error: error.message });
      return;
    }
    setTeamActionState({ loading: false });
    setActiveTeam(null);
    await loadMyTeams();
    setView("teams");
  }

  function agreementStatusSummary() {
    if (agreementLoading) return "Checking status…";
    if (agreementStatus.finalizedAt) {
      return `Finalized ${new Date(agreementStatus.finalizedAt).toLocaleDateString()} — everyone answers a shared set of "how we work" questions, then shapes the answers into one agreement together.`;
    }
    const answeredCount = AGREEMENT_QUESTIONS.filter((q) => (agreementDraft[q.key] || "").trim()).length;
    if (answeredCount > 0) {
      return `Draft in progress — ${answeredCount} of ${AGREEMENT_QUESTIONS.length} questions have a shared answer so far.`;
    }
    return `Not started yet — everyone answers a shared set of "how we work" questions, then shapes the answers into one agreement together.`;
  }

  async function openAgreement(team: TeamSummary) {
    setActiveTeam(team);
    setView("agreement");
    setAgreementTab("respond");
    await loadAgreementData(team.id);
  }

  async function loadAgreementData(teamId: string) {
    setAgreementLoading(true);
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAgreementLoading(false);
      return;
    }
    const [mine, all, draft, status] = await Promise.all([
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

    setAgreementResponses(((all.data as AgreementResponseRow[] | null) || []).filter((r) => r.answer && r.answer.trim()));

    const draftMap: Record<string, string> = {};
    ((draft.data as AgreementDraftRow[] | null) || []).forEach((r) => {
      draftMap[r.question_key] = r.draft_text;
    });
    setAgreementDraft(draftMap);

    const statusRow = Array.isArray(status.data) && status.data.length > 0 ? (status.data[0] as { finalized_at: string | null; finalized_by_email: string | null }) : null;
    setAgreementStatus({ finalizedAt: statusRow?.finalized_at ?? null, finalizedByEmail: statusRow?.finalized_by_email ?? null });

    setAgreementLoading(false);
  }

  function setMyResponse(key: string, val: string) {
    setMyResponses((r) => ({ ...r, [key]: val }));
    if (!activeTeam) return;
    const teamId = activeTeam.id;
    clearTimeout(responseSaveTimers.current[key]);
    responseSaveTimers.current[key] = setTimeout(() => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      supabase.rpc("submit_agreement_response", { p_team_id: teamId, p_question_key: key, p_answer: val }).then(({ error }) => {
        if (error) {
          console.error("Wavelength: saving agreement response failed", error);
          return;
        }
        // Keep the "everyone's answers" tab in sync with what we just saved.
        setAgreementResponses((rows) => {
          const email = authUser?.email || "";
          const others = rows.filter((r) => !(r.question_key === key && r.user_id === authUser?.id));
          if (!val.trim()) return others;
          return [...others, { question_key: key, user_id: authUser?.id || "", email, answer: val, updated_at: new Date().toISOString() }];
        });
      });
    }, 900);
  }

  function setAgreementDraftText(key: string, val: string) {
    setAgreementDraft((d) => ({ ...d, [key]: val }));
    setAgreementStatus({ finalizedAt: null, finalizedByEmail: null });
    if (!activeTeam) return;
    const teamId = activeTeam.id;
    clearTimeout(draftSaveTimers.current[key]);
    draftSaveTimers.current[key] = setTimeout(() => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      supabase.rpc("save_agreement_draft", { p_team_id: teamId, p_question_key: key, p_draft_text: val }).then(({ error }) => {
        if (error) console.error("Wavelength: saving agreement draft failed", error);
      });
    }, 900);
  }

  async function runAgreementSynthesis(q: AgreementQuestion) {
    const answers = agreementResponses.filter((r) => r.question_key === q.key && r.answer.trim());
    if (answers.length === 0) {
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false, error: "No answers yet to draft from — wait for teammates to answer, or write it yourself." } }));
      return;
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
          currentDraft: agreementDraft[q.key],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setAgreementDraftText(q.key, data.text);
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false } }));
    } catch (err) {
      setSynthesis((s) => ({ ...s, [q.key]: { loading: false, error: err instanceof Error ? err.message : "Something went wrong." } }));
    }
  }

  async function setFinalized(finalized: boolean) {
    if (!activeTeam) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.rpc("set_agreement_finalized", { p_team_id: activeTeam.id, p_finalized: finalized });
    if (error) {
      console.error("Wavelength: updating finalized status failed", error);
      return;
    }
    setAgreementStatus(
      finalized ? { finalizedAt: new Date().toISOString(), finalizedByEmail: authUser?.email ?? null } : { finalizedAt: null, finalizedByEmail: null }
    );
  }

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
          {renderAuthNav()}
        </div>

        <section className="hero">
          <h1 className="hero-title">
            Understand each other,
            <br />
            <span style={{ color: "var(--accent)" }}>work better together</span>.
          </h1>
          <p className="hero-subtitle">
            Build your personal manual, then bring your team into a shared working agreement — a few honest answers at a time.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setView("wizard")}>{ctaLabel}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setView("teams")}>Start or join a team</button>
          </div>
          <button type="button" className="btn btn-ghost hero-sample-link" onClick={() => setPreviewOpen("onepager")}>View a sample</button>
        </section>

        <section className="vision-section">
          <span className="section-eyebrow">Why it matters</span>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="1.6" /><path d="M8 12.3l2.6 2.6L16 9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <h3>Better Trust</h3>
              <p>Grows faster when there&apos;s nothing to guess.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6.5" strokeWidth="1.6" /><circle cx="15" cy="12" r="6.5" strokeWidth="1.6" /></svg></div>
              <h3>Stronger Collaboration</h3>
              <p>Less friction, better & faster synergy.</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon"><svg viewBox="0 0 24 24"><path d="M5.5 15.5a9 9 0 0 1 13 0" strokeWidth="1.6" strokeLinecap="round" /><path d="M8.3 18a5 5 0 0 1 7.4 0" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="20" r="1.1" stroke="none" fill="currentColor" /></svg></div>
              <h3>Deeper Relationships</h3>
              <p>Built on understanding, not small talk.</p>
            </div>
          </div>
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
          <div className="sidebar-brand">
            <LogoMark />Wavelength<AudioToggle />
          </div>
          <p className="sidebar-tagline">A few honest details, so the people you work with don&apos;t have to guess.</p>
          {renderAuthNav()}
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

  function renderInviteBanner() {
    if (!pendingInvite) return null;
    return (
      <div className="invite-banner">
        {!pendingInvite.checked ? (
          <p>Checking invite link…</p>
        ) : pendingInvite.teamName ? (
          <>
            <p>
              You&apos;ve been invited to join <strong>{pendingInvite.teamName}</strong>.
            </p>
            {authUser ? (
              <button type="button" className="btn btn-primary" disabled={joinState.loading} onClick={() => joinByCode(pendingInvite.code, true)}>
                {joinState.loading ? "Joining…" : `Join ${pendingInvite.teamName}`}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAuthState({ sending: false, sent: false });
                  setAuthModalOpen(true);
                }}
              >
                Sign in to join
              </button>
            )}
            {joinState.error && <p className="assist-error">{joinState.error}</p>}
          </>
        ) : (
          <p>That invite link doesn&apos;t match a team — double check the link, or ask for a fresh one.</p>
        )}
      </div>
    );
  }

  function renderTeams() {
    return (
      <div className="home">
        <div className="home-nav">
          <div className="home-brand">
            <LogoMark />
            <span className="home-wordmark">Wavelength</span>
            <AudioToggle />
          </div>
          {renderAuthNav()}
        </div>

        <section className="teams-hub">
          <button type="button" className="nav-home-link" onClick={() => setView("home")}>← Back to home</button>
          <h1 className="step-title" style={{ marginTop: 16, marginBottom: 8 }}>Your teams</h1>
          <p className="step-subtitle" style={{ marginBottom: 28 }}>
            Build a shared working agreement with your team, and see who&apos;s added their own personal manual along the way.
          </p>

          {!supabaseEnabled ? (
            <p className="empty-state">Team features need accounts set up first — see the project README for setup steps.</p>
          ) : (
            <>
              {renderInviteBanner()}

              {!authUser ? (
                <div className="invite-banner">
                  <p>Sign in to create a team, or to join one with an invite link.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setAuthState({ sending: false, sent: false });
                      setAuthModalOpen(true);
                    }}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <>
                  {!teamsLoaded ? (
                    <p className="empty-state">Loading your teams…</p>
                  ) : myTeams.length === 0 ? (
                    <p className="empty-state">You&apos;re not on a team yet — create one below, or ask a teammate for their invite link.</p>
                  ) : (
                    <div className="team-list">
                      {myTeams.map((t) => (
                        <button type="button" key={t.id} className="team-list-item" onClick={() => openTeam(t)}>
                          <span className="team-list-name">{t.name}</span>
                          {t.is_owner && <span className="tag">Owner</span>}
                        </button>
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
                          onKeyDown={(e) => e.key === "Enter" && createTeam()}
                        />
                      </div>
                      {createTeamState.error && <p className="assist-error">{createTeamState.error}</p>}
                      <button type="button" className="btn btn-primary" disabled={createTeamState.loading} onClick={createTeam}>
                        {createTeamState.loading ? "Creating…" : "Create team"}
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
                          onKeyDown={(e) => e.key === "Enter" && joinByCode(joinCodeInput)}
                        />
                      </div>
                      {joinState.error && !pendingInvite && <p className="assist-error">{joinState.error}</p>}
                      <button type="button" className="btn btn-secondary" disabled={joinState.loading} onClick={() => joinByCode(joinCodeInput)}>
                        {joinState.loading ? "Joining…" : "Join team"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    );
  }

  function renderTeamDetail() {
    if (!activeTeam) return renderTeams();
    const inviteUrl = `${window.location.origin}/join/${activeTeam.invite_code}`;
    return (
      <div className="home">
        <div className="home-nav">
          <div className="home-brand">
            <LogoMark />
            <span className="home-wordmark">Wavelength</span>
            <AudioToggle />
          </div>
          {renderAuthNav()}
        </div>

        <section className="teams-hub">
          <button type="button" className="nav-home-link" onClick={() => setView("teams")}>← All teams</button>

          {renaming ? (
            <div className="field" style={{ maxWidth: 360, marginTop: 16 }}>
              <label htmlFor="rename-team-input">Team name</label>
              <input
                id="rename-team-input"
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTeamRename()}
                autoFocus
              />
              {renameState.error && <p className="assist-error">{renameState.error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" disabled={renameState.loading} onClick={saveTeamRename}>
                  {renameState.loading ? "Saving…" : "Save name"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setRenaming(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="team-title-row">
              <h1 className="step-title" style={{ marginTop: 16, marginBottom: 8 }}>{activeTeam.name}</h1>
              {activeTeam.is_owner && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setRenameInput(activeTeam.name);
                    setRenameState({ loading: false });
                    setRenaming(true);
                  }}
                >
                  Rename
                </button>
              )}
            </div>
          )}
          <p className="step-subtitle" style={{ marginBottom: 20 }}>Share this link so teammates can join.</p>

          <div className="invite-row">
            <input type="text" readOnly value={inviteUrl} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-secondary" onClick={() => copyInvite(inviteUrl)}>
              {copyState === "copied" ? "Copied!" : "Copy link"}
            </button>
          </div>

          <h3 className="review-heading" style={{ marginTop: 36 }}>Who&apos;s on this team</h3>
          {rosterLoading ? (
            <p className="empty-state">Loading roster…</p>
          ) : (
            <div className="roster-list">
              {roster.map((m) => {
                const canView = m.has_manual && m.user_id !== authUser?.id;
                const rowContent = (
                  <>
                    <span className="roster-email">{m.email}{m.user_id === authUser?.id ? " (you)" : ""}</span>
                    <span className={"roster-badge" + (m.has_manual ? " roster-badge-done" : "")}>
                      {m.has_manual ? "Manual added" : "No manual yet"}
                    </span>
                  </>
                );
                return canView ? (
                  <button type="button" className="roster-row roster-row-clickable" key={m.user_id} onClick={() => viewTeammateManual(m)}>
                    {rowContent}
                  </button>
                ) : (
                  <div className="roster-row" key={m.user_id}>
                    {rowContent}
                  </div>
                );
              })}
            </div>
          )}

          <div className="agreement-cta">
            <div>
              <h3 className="review-heading" style={{ marginBottom: 6 }}>Team Working Agreement</h3>
              <p className="step-subtitle" style={{ marginBottom: 0 }}>{agreementStatusSummary()}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => openAgreement(activeTeam)}>Open agreement</button>
          </div>

          <div className="danger-zone">
            {teamActionState.error && <p className="assist-error">{teamActionState.error}</p>}
            {activeTeam.is_owner ? (
              confirmingDelete ? (
                <>
                  <p className="step-subtitle" style={{ marginBottom: 10 }}>
                    Delete &quot;{activeTeam.name}&quot; for everyone? This removes the roster and the working agreement — it can&apos;t be undone.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="btn btn-primary btn-danger" disabled={teamActionState.loading} onClick={deleteActiveTeam}>
                      {teamActionState.loading ? "Deleting…" : "Delete for good"}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn btn-ghost danger-link" onClick={() => setConfirmingDelete(true)}>Delete team</button>
              )
            ) : confirmingLeave ? (
              <>
                <p className="step-subtitle" style={{ marginBottom: 10 }}>Leave &quot;{activeTeam.name}&quot;? You can rejoin later with an invite link.</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="btn btn-secondary" disabled={teamActionState.loading} onClick={leaveActiveTeam}>
                    {teamActionState.loading ? "Leaving…" : "Leave team"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmingLeave(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-ghost danger-link" onClick={() => setConfirmingLeave(true)}>Leave team</button>
            )}
          </div>
        </section>
        {renderTeammateManualModal()}
      </div>
    );
  }

  function renderTeammateManualModal() {
    if (!teammateManual) return null;
    const title = isFilled(teammateManual.values.name) ? `Working With ${teammateManual.values.name.trim()}` : `Working With ${teammateManual.email}`;
    return (
      <div className="preview-backdrop" onClick={() => setTeammateManual(null)}>
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="preview-modal-head">
            <span className="kicker">{teammateManual.email}</span>
            <button type="button" className="btn btn-ghost close-btn" onClick={() => setTeammateManual(null)}>Close</button>
          </div>
          <h2 className="step-title" style={{ fontSize: 26 }}>{title}</h2>
          <div className="pill-group" style={{ marginBottom: 26 }}>
            <button type="button" className={"pill" + (teammateManual.mode === "onepager" ? " selected" : "")} onClick={() => setTeammateManual((t) => (t ? { ...t, mode: "onepager" } : t))}>One-pager</button>
            <button type="button" className={"pill" + (teammateManual.mode === "detailed" ? " selected" : "")} onClick={() => setTeammateManual((t) => (t ? { ...t, mode: "detailed" } : t))}>Detailed</button>
          </div>
          {teammateManualLoading ? (
            <p className="empty-state">Loading…</p>
          ) : teammateManualError ? (
            <p className="empty-state">{teammateManualError}</p>
          ) : (
            <ManualBody values={teammateManual.values} mode={teammateManual.mode} />
          )}
        </div>
      </div>
    );
  }

  function renderAgreementRespond() {
    const answeredCount = AGREEMENT_QUESTIONS.filter((q) => (myResponses[q.key] || "").trim()).length;
    return (
      <div className="agreement-questions">
        <p className="step-subtitle" style={{ marginBottom: 22 }}>
          You&apos;ve answered {answeredCount} of {AGREEMENT_QUESTIONS.length} — skip any you&apos;re not sure about, you can always come back.
        </p>
        {AGREEMENT_QUESTIONS.map((q) => (
          <div className="field" key={q.key}>
            <label htmlFor={`aq-${q.key}`}>{q.label}</label>
            <textarea
              id={`aq-${q.key}`}
              value={myResponses[q.key] || ""}
              placeholder={q.placeholder}
              onChange={(e) => setMyResponse(q.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderAgreementCompare() {
    return (
      <div className="agreement-compare">
        {AGREEMENT_QUESTIONS.map((q) => {
          const rows = agreementResponses.filter((r) => r.question_key === q.key);
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
                        {r.email}
                        {r.user_id === authUser?.id ? " (you)" : ""}
                      </span>
                      <p className="review-value" style={{ margin: "4px 0 0" }}>{r.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderAgreementDraft() {
    const finalized = Boolean(agreementStatus.finalizedAt);

    if (finalized) {
      return (
        <div className="agreement-draft">
          <div className="agreement-finalize agreement-finalize-top">
            <p className="step-subtitle" style={{ marginBottom: 0 }}>
              Finalized {new Date(agreementStatus.finalizedAt as string).toLocaleDateString()}
              {agreementStatus.finalizedByEmail ? ` by ${agreementStatus.finalizedByEmail}` : ""}. It&apos;s read-only until someone edits it.
            </p>
            <div className="agreement-finalize-actions">
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print / Save as PDF</button>
              <button type="button" className="btn btn-ghost" onClick={() => setFinalized(false)}>Edit agreement</button>
            </div>
          </div>
          {AGREEMENT_QUESTIONS.map((q) => (
            <div className="review-section" key={q.key}>
              <h3 className="review-heading">{q.label}</h3>
              <p className="review-value">{(agreementDraft[q.key] || "").trim() || "Not answered."}</p>
            </div>
          ))}
        </div>
      );
    }

    const answeredCount = AGREEMENT_QUESTIONS.filter((q) => (agreementDraft[q.key] || "").trim()).length;
    const hasDraftContent = answeredCount > 0;

    return (
      <div className="agreement-draft">
        <p className="step-subtitle" style={{ marginBottom: 22 }}>
          {answeredCount} of {AGREEMENT_QUESTIONS.length} questions have a shared answer so far.
        </p>
        {AGREEMENT_QUESTIONS.map((q) => {
          const state = synthesis[q.key];
          const answerCount = agreementResponses.filter((r) => r.question_key === q.key).length;
          return (
            <div className="field" key={q.key}>
              <div className="field-label-row">
                <label htmlFor={`ad-${q.key}`}>{q.label}</label>
                <AssistButton
                  state={state}
                  onClick={() => runAgreementSynthesis(q)}
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
                value={agreementDraft[q.key] || ""}
                placeholder={answerCount > 0 ? "✨ Draft this from everyone's answers, or write it yourself…" : "Write the team's shared answer here…"}
                onChange={(e) => setAgreementDraftText(q.key, e.target.value)}
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
          <button type="button" className="btn btn-primary" disabled={!hasDraftContent} onClick={() => setFinalized(true)}>Mark as finalized</button>
        </div>
      </div>
    );
  }

  function renderAgreementPrintView() {
    if (!activeTeam) return null;
    const rows = AGREEMENT_QUESTIONS.map((q) => ({ label: q.label, value: agreementDraft[q.key] || "" })).filter((r) => r.value.trim());
    return (
      <div className="agreement-print-view">
        <div className="print-letterhead">
          <div className="print-letterhead-brand"><LogoMark />Wavelength</div>
          <div className="print-letterhead-meta">Team Working Agreement &middot; {printDateString()}</div>
        </div>
        <h1 className="step-title" style={{ marginTop: 8 }}>{activeTeam.name}</h1>
        <ReviewSection heading="How We Work" rows={rows} />
        <div className="print-footer">Prepared with Wavelength</div>
      </div>
    );
  }

  function renderAgreement() {
    if (!activeTeam) return renderTeams();
    return (
      <div className="home agreement-page">
        <div className="home-nav">
          <div className="home-brand">
            <LogoMark />
            <span className="home-wordmark">Wavelength</span>
            <AudioToggle />
          </div>
          {renderAuthNav()}
        </div>

        <section className="teams-hub">
          <button type="button" className="nav-home-link" onClick={() => setView("team")}>← {activeTeam.name}</button>
          <h1 className="step-title" style={{ marginTop: 16, marginBottom: 8 }}>Team Working Agreement</h1>
          <p className="step-subtitle" style={{ marginBottom: 20 }}>
            {agreementStatus.finalizedAt
              ? `Finalized ${new Date(agreementStatus.finalizedAt).toLocaleDateString()}${agreementStatus.finalizedByEmail ? ` by ${agreementStatus.finalizedByEmail}` : ""}.`
              : "Answer honestly, see how the team compares, then shape it into one shared agreement."}
          </p>

          <div className="pill-group" style={{ marginBottom: 28 }}>
            <button type="button" className={"pill" + (agreementTab === "respond" ? " selected" : "")} onClick={() => setAgreementTab("respond")}>Your answers</button>
            <button type="button" className={"pill" + (agreementTab === "compare" ? " selected" : "")} onClick={() => setAgreementTab("compare")}>Everyone&apos;s answers</button>
            <button type="button" className={"pill" + (agreementTab === "draft" ? " selected" : "")} onClick={() => setAgreementTab("draft")}>Shared draft</button>
          </div>

          {agreementLoading ? (
            <p className="empty-state">Loading…</p>
          ) : agreementTab === "respond" ? (
            renderAgreementRespond()
          ) : agreementTab === "compare" ? (
            renderAgreementCompare()
          ) : (
            renderAgreementDraft()
          )}
        </section>
        {renderAgreementPrintView()}
      </div>
    );
  }

  function renderModal() {
    if (!previewOpen) return null;
    const isAgreement = previewOpen === "agreement";
    const title = isAgreement ? "Platform Team" : docTitleFor(SAMPLE_VALUES);
    return (
      <div className="preview-backdrop" onClick={() => setPreviewOpen(null)}>
        <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="preview-modal-head">
            <span className="kicker">{isAgreement ? "Sample team agreement" : "Sample manual"}</span>
            <button type="button" className="btn btn-ghost close-btn" onClick={() => setPreviewOpen(null)}>Close</button>
          </div>
          <h2 className="step-title" style={{ fontSize: 26 }}>{title}</h2>
          <p className="step-subtitle" style={{ marginBottom: 20 }}>
            {isAgreement
              ? "A glimpse of a finalized Team Working Agreement — every team's will read differently."
              : "Just a glimpse of what's possible — your own words will live here soon enough."}
          </p>
          <div className="pill-group" style={{ marginBottom: 26 }}>
            <button type="button" className={"pill" + (previewOpen === "onepager" ? " selected" : "")} onClick={() => setPreviewOpen("onepager")}>One-pager</button>
            <button type="button" className={"pill" + (previewOpen === "detailed" ? " selected" : "")} onClick={() => setPreviewOpen("detailed")}>Detailed</button>
            <button type="button" className={"pill" + (previewOpen === "agreement" ? " selected" : "")} onClick={() => setPreviewOpen("agreement")}>Team agreement</button>
          </div>
          {isAgreement ? (
            <ReviewSection heading="How We Work" rows={AGREEMENT_QUESTIONS.map((q) => ({ label: q.label, value: SAMPLE_AGREEMENT[q.key] }))} />
          ) : (
            <ManualBody values={SAMPLE_VALUES} mode={previewOpen} />
          )}
        </div>
      </div>
    );
  }

  function renderAuthNav() {
    if (!supabaseEnabled) return null;
    return (
      <div className="auth-nav">
        <button type="button" className="auth-nav-link" onClick={() => setView("teams")}>Teams</button>
        {authUser ? (
          <>
            <span className="auth-nav-email">{authUser.email}</span>
            <button type="button" className="auth-nav-link" onClick={signOut}>Sign out</button>
          </>
        ) : (
          <button
            type="button"
            className="auth-nav-link"
            onClick={() => {
              setAuthState({ sending: false, sent: false });
              setAuthModalOpen(true);
            }}
          >
            Sign in to save your progress
          </button>
        )}
      </div>
    );
  }

  function renderAuthModal() {
    if (!authModalOpen) return null;
    return (
      <div className="preview-backdrop" onClick={() => setAuthModalOpen(false)}>
        <div className="preview-modal auth-modal" onClick={(e) => e.stopPropagation()}>
          <div className="preview-modal-head">
            <span className="kicker">Save your progress</span>
            <button type="button" className="btn btn-ghost close-btn" onClick={() => setAuthModalOpen(false)}>Close</button>
          </div>
          <h2 className="step-title" style={{ fontSize: 22 }}>Sign in with email</h2>
          {authState.sent ? (
            <p className="step-subtitle" style={{ marginBottom: 0 }}>
              Check <strong>{authEmail}</strong> for a link to sign in — no password needed.
            </p>
          ) : (
            <>
              <p className="step-subtitle" style={{ marginBottom: 22 }}>
                We&apos;ll email you a link — no password to remember. Your manual then saves automatically as you go.
              </p>
              <div className="field" style={{ marginBottom: 8 }}>
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={authEmail}
                  placeholder="you@company.com"
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                />
              </div>
              {authState.error && <p className="assist-error" style={{ marginBottom: 16 }}>{authState.error}</p>}
              <button type="button" className="btn btn-primary" disabled={authState.sending} onClick={sendMagicLink} style={{ marginTop: 8 }}>
                {authState.sending ? "Sending…" : "Send sign-in link"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {view === "home"
        ? renderHome()
        : view === "wizard"
        ? renderWizard()
        : view === "teams"
        ? renderTeams()
        : view === "team"
        ? renderTeamDetail()
        : renderAgreement()}
      {renderModal()}
      {renderAuthModal()}
    </div>
  );
}
