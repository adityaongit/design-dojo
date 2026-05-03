import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.25), transparent 60%), #0a0a0a",
          color: "#fafafa",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 28,
            color: "#a3a3a3",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#10b981",
            }}
          />
          {SITE.name.toLowerCase()}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>System design practice</span>
          <span style={{ color: "#10b981" }}>for everyone.</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#d4d4d4",
            maxWidth: 980,
            lineHeight: 1.35,
          }}
        >
          Free, unlimited HLD + LLD interview practice with AI feedback.
          Bring your own key — or run a local model.
        </div>
        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 16,
            fontSize: 22,
            color: "#a3a3a3",
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              border: "1px solid #262626",
              borderRadius: 8,
            }}
          >
            BYOK
          </span>
          <span
            style={{
              padding: "8px 16px",
              border: "1px solid #262626",
              borderRadius: 8,
            }}
          >
            Open source
          </span>
          <span
            style={{
              padding: "8px 16px",
              border: "1px solid #262626",
              borderRadius: 8,
            }}
          >
            ≈ $0.0001 / session
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
