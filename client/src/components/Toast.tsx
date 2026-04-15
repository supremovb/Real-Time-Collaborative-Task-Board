"use client";

import { useToast } from "@/context/ToastContext";
import { CheckIcon, XIcon, AlertIcon } from "./Icons";
import React from "react";

const STYLES = {
  success: { border: "rgba(16,185,129,0.45)",  iconBg: "#10b981", Icon: CheckIcon },
  error:   { border: "rgba(239,68,68,0.45)",   iconBg: "#ef4444", Icon: XIcon },
  warning: { border: "rgba(245,158,11,0.45)",  iconBg: "#f59e0b", Icon: AlertIcon },
  info:    { border: "rgba(99,102,241,0.45)",  iconBg: "#6366f1", Icon: CheckIcon },
};

export default function Toasts() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none"
      style={{ maxWidth: 380 }}
    >
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto cursor-pointer animate-slide-right"
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid ${s.border}`,
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: s.iconBg, color: "#fff" }}
            >
              <s.Icon size={13} />
            </span>
            <p className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>
              {t.message}
            </p>
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
              <XIcon size={12} />
            </span>
          </div>
        );
      })}
    </div>
  );
}
