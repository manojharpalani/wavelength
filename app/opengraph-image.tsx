import { ImageResponse } from "next/og";

// Open Graph / Twitter card image, generated from the same inline squiggle
// used as `LogoMark` in app/page.tsx (no public/ directory or binary asset
// in this repo — see docs/DECISIONS.md).

export const alt = "Wavelength — build your team's shared working agreement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "#f7f3ee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 12c1.4-4.2 2.8-6.3 4.3-6.3s2.9 8.6 4.4 8.6 2.9-6.3 4.4-6.3 2.6 3.7 4.1 3.7"
              stroke="#c2603f"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 34, fontWeight: 600, color: "#2b241f" }}>Wavelength</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 46, fontWeight: 600, lineHeight: 1.25, width: 880, color: "#2b241f" }}>
          <span>Build your team&apos;s&nbsp;</span>
          <span style={{ color: "#c2603f" }}>shared working agreement.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
