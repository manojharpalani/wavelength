// ---------- personal manual content model ----------
//
// Ported out of the old single-file app/page.tsx so it can be shared by
// the wizard (app/manual/edit), the read-only "My Manual" view
// (app/(app)/manual), and a teammate's profile page
// (app/(app)/teams/[teamId]/members/[userId]) without duplication.

export type FieldKind = "text" | "textarea" | "tags" | "segmented" | "select";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[];
  // Friendlier display text for a "select" option than its raw stored
  // value (e.g. "INTJ — Architect" for a value of "INTJ"). Falls back to
  // the raw value when omitted.
  optionLabel?: (value: string) => string;
  // An optional link shown under a field, e.g. pointing to a free test
  // for the Myers-Briggs field below.
  helperLink?: { label: string; href: string };
}

// The 16 Myers-Briggs types, self-reported (see docs/DECISIONS.md — no
// in-app quiz, no licensed MBTI branding/artwork). Used for the "About
// You" dropdown, and to link out to (and label) a person's type wherever
// it's shown to others — see components/MbtiBadge.
export const MBTI_TYPES: { code: string; nickname: string }[] = [
  { code: "INTJ", nickname: "Architect" },
  { code: "INTP", nickname: "Logician" },
  { code: "ENTJ", nickname: "Commander" },
  { code: "ENTP", nickname: "Debater" },
  { code: "INFJ", nickname: "Advocate" },
  { code: "INFP", nickname: "Mediator" },
  { code: "ENFJ", nickname: "Protagonist" },
  { code: "ENFP", nickname: "Campaigner" },
  { code: "ISTJ", nickname: "Logistician" },
  { code: "ISFJ", nickname: "Defender" },
  { code: "ESTJ", nickname: "Executive" },
  { code: "ESFJ", nickname: "Consul" },
  { code: "ISTP", nickname: "Virtuoso" },
  { code: "ISFP", nickname: "Adventurer" },
  { code: "ESTP", nickname: "Entrepreneur" },
  { code: "ESFP", nickname: "Entertainer" },
];
export const MBTI_LOOKUP: Record<string, { nickname: string }> = Object.fromEntries(MBTI_TYPES.map((t) => [t.code, t]));

export function mbtiTypeUrl(code: string) {
  return `https://www.16personalities.com/${code.toLowerCase()}-personality`;
}

export interface StepDef {
  id: string;
  kind: "form" | "review";
  title?: string;
  subtitle?: string;
  fields?: FieldDef[];
}

export const STEPS: StepDef[] = [
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
      {
        key: "mbtiType",
        label: "Myers-Briggs type (optional)",
        kind: "select",
        options: MBTI_TYPES.map((t) => t.code),
        optionLabel: (code) => (MBTI_LOOKUP[code] ? `${code} — ${MBTI_LOOKUP[code].nickname}` : code),
        helperLink: { label: "Don't know yours? Take the free test", href: "https://www.16personalities.com/free-personality-test" },
      },
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

export const REVIEW_GROUPS: { heading: string; rows: { key: string; label: string }[] }[] = [
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

export const ONEPAGER_QUICKFACTS = [
  { key: "quickChannel", label: "Best via" },
  { key: "responseTime", label: "Reply time" },
  { key: "directness", label: "Style" },
];

export const ONEPAGER_ESSENTIALS = [
  { key: "knownFor", label: "Known for" },
  { key: "whatHelps", label: "Do this and I'll thrive" },
  { key: "feedbackReceive", label: "Feedback that works" },
  { key: "frictionApproach", label: "If something's off" },
];

// Every field key across all steps — used to compute a manual's
// "completion" fraction on the dashboard.
export const ALL_FIELD_KEYS: string[] = STEPS.flatMap((s) => (s.fields || []).map((f) => f.key));

export type Values = Record<string, string>;

export function isFilled(s: string | undefined) {
  return !!(s && s.trim().length > 0);
}

export function deriveTags(raw: string | undefined) {
  return (raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function buildDetailedSections(values: Values) {
  return REVIEW_GROUPS.map((g) => ({
    heading: g.heading,
    items: g.rows.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value)),
  })).filter((g) => g.items.length > 0);
}

export function buildOnePagerFacts(values: Values) {
  return ONEPAGER_QUICKFACTS.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value));
}

export function buildOnePagerEssentials(values: Values) {
  return ONEPAGER_ESSENTIALS.map((r) => ({ label: r.label, value: values[r.key] })).filter((it) => isFilled(it.value));
}

export function docTitleFor(values: Values) {
  return isFilled(values.name) ? `Working With ${values.name.trim()}` : "Working With Me";
}

export function printDateString() {
  try {
    return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export function manualCompletion(values: Values) {
  const filled = ALL_FIELD_KEYS.filter((k) => isFilled(values[k])).length;
  return { filled, total: ALL_FIELD_KEYS.length, pct: Math.round((filled / ALL_FIELD_KEYS.length) * 100) };
}

export const SAMPLE_VALUES: Values = {
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
