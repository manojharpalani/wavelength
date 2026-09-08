import { ImageResponse } from "next/og";

// Favicon, generated from the same inline squiggle used as `LogoMark` in
// app/page.tsx (no public/ directory or binary asset in this repo — see
// docs/DECISIONS.md). Next.js picks this up automatically as the site
// favicon; keep the path/colors in sync with `LogoMark` if that changes.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f3ee",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 12c1.4-4.2 2.8-6.3 4.3-6.3s2.9 8.6 4.4 8.6 2.9-6.3 4.4-6.3 2.6 3.7 4.1 3.7"
            stroke="#c2603f"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
