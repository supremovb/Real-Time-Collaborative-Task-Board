import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          paddingBottom: 5,
          paddingLeft: 5,
          paddingRight: 5,
        }}
      >
        {/* Column 1 — 3 cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
        </div>
        {/* Column 2 — 2 cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.5)", borderRadius: 1 }} />
        </div>
        {/* Column 3 — 3 cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
          <div style={{ width: 6, height: 3, background: "rgba(255,255,255,0.95)", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
