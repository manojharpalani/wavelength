// A generated initials avatar — no photo upload/storage, per
// docs/DECISIONS.md. The color is derived from a hash of the person's
// name/email so the same person always gets the same color, without any
// state to store.

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFor(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return "?";
  const emailMatch = trimmed.match(/^[^\s@]+@/);
  if (emailMatch) {
    const local = emailMatch[0].slice(0, -1);
    return local.slice(0, 2).toUpperCase();
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZES = { sm: 28, md: 40, lg: 64 } as const;

export function Avatar({
  name,
  email,
  size = "md",
  className = "",
}: {
  name?: string | null;
  email?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = (name && name.trim()) || (email && email.trim()) || "?";
  const initials = initialsFor(label);
  const hue = hashString(label) % 360;
  const px = SIZES[size];
  return (
    <span
      className={"avatar avatar-" + size + (className ? " " + className : "")}
      style={{
        width: px,
        height: px,
        fontSize: Math.round(px * 0.4),
        background: `oklch(88% 0.07 ${hue})`,
        color: `oklch(32% 0.09 ${hue})`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
