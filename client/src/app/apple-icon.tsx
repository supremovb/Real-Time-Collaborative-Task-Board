import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 14,
          paddingBottom: 28,
          paddingLeft: 28,
          paddingRight: 28,
        }}
      >
        {/* Column 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.45)", borderRadius: 4 }} />
        </div>
        {/* Column 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.45)", borderRadius: 4 }} />
        </div>
        {/* Column 3 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
          <div style={{ width: 34, height: 16, background: "rgba(255,255,255,0.95)", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
