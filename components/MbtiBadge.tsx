import { MBTI_LOOKUP, mbtiTypeUrl } from "@/lib/manual/data";

export function MbtiBadge({ code, variant = "full" }: { code: string; variant?: "full" | "compact" }) {
  const upper = code.trim().toUpperCase();
  const info = MBTI_LOOKUP[upper];
  return (
    <a
      className={"mbti-badge" + (variant === "compact" ? " mbti-badge-compact" : "")}
      href={mbtiTypeUrl(upper)}
      target="_blank"
      rel="noreferrer noopener"
      title={info ? `${upper} — ${info.nickname}` : upper}
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="mbti-badge-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3l2.4 5.8L20 11l-5.6 2.2L12 19l-2.4-5.8L4 11l5.6-2.2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span className="mbti-badge-code">{upper}</span>
      {variant === "full" && info && <span className="mbti-badge-name">{info.nickname}</span>}
    </a>
  );
}
