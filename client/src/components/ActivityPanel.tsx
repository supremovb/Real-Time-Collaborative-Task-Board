"use client";

import { useEffect, useMemo, useRef } from "react";
import { ActivityEntry, ActivityAction } from "@/types";
import { XIcon, HistoryIcon, UserPlusIcon, UserMinusIcon, PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from "./Icons";

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const COLUMN_LABELS: Record<string, string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "done": "Done",
};

function ActionIcon({ action }: { action: ActivityAction }) {
  const size = 12;
  switch (action) {
    case "member:joined":  return <UserPlusIcon size={size} />;
    case "member:left":    return <UserMinusIcon size={size} />;
    case "task:created":   return <PlusIcon size={size} />;
    case "task:updated":   return <PencilIcon size={size} />;
    case "task:deleted":   return <TrashIcon size={size} />;
    case "task:moved":     return <ArrowLeftIcon size={size} style={{ transform: "rotate(180deg)" }} />;
    default:               return <HistoryIcon size={size} />;
  }
}

function actionColor(action: ActivityAction): string {
  switch (action) {
    case "member:joined": return "#10b981";
    case "member:left":   return "#6b7280";
    case "task:created":  return "#6366f1";
    case "task:updated":  return "#f59e0b";
    case "task:deleted":  return "#ef4444";
    case "task:moved":    return "#3b82f6";
    default:              return "#6b7280";
  }
}

function actionLabel(entry: ActivityEntry): string {
  switch (entry.action) {
    case "member:joined": return `${entry.userName} joined`;
    case "member:left":   return `${entry.userName} left`;
    case "task:created":  return `${entry.userName} created "${entry.taskTitle ?? "task"}"`;
    case "task:updated":  return `${entry.userName} edited "${entry.taskTitle ?? "task"}"${entry.detail ? ` (${entry.detail})` : ""}`;
    case "task:deleted":  return `${entry.userName} deleted "${entry.taskTitle ?? "task"}"`;
    case "task:moved": {
      const from = entry.fromColumn ? COLUMN_LABELS[entry.fromColumn] ?? entry.fromColumn : "?";
      const to   = entry.toColumn   ? COLUMN_LABELS[entry.toColumn]   ?? entry.toColumn   : "?";
      return `${entry.userName} moved "${entry.taskTitle ?? "task"}" from ${from} → ${to}`;
    }
    default: return entry.detail ?? entry.action;
  }
}

export default function ActivityPanel({
  entries,
  onClose,
}: {
  entries: ActivityEntry[];
  onClose: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const visibleEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const condensed: ActivityEntry[] = [];

    for (const entry of sorted) {
      const last = condensed[condensed.length - 1];
      const sameUser = last?.userName === entry.userName;
      const bothPresence = last && last.action.startsWith("member:") && entry.action.startsWith("member:");
      const withinBurst = last && entry.timestamp - last.timestamp < 10_000;

      if (sameUser && bothPresence && withinBurst) {
        condensed[condensed.length - 1] = entry;
      } else {
        condensed.push(entry);
      }
    }

    return condensed;
  }, [entries]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleEntries.length]);

  return (
    <div
      className="fixed right-0 top-0 h-full w-80 flex flex-col z-40 shadow-2xl"
      style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <HistoryIcon size={15} style={{ color: "var(--accent-indigo)" }} />
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Activity
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent-indigo)" }}
          >
            {visibleEntries.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <XIcon size={13} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {visibleEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <HistoryIcon size={32} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              No activity yet.
              <br />Actions will appear here.
            </p>
          </div>
        )}
        {visibleEntries.map((entry) => {
          const color = actionColor(entry.action);
          return (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 px-2 py-2 rounded-lg group"
              style={{ transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Icon dot */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${color}20`, color }}
              >
                <ActionIcon action={entry.action} />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug" style={{ color: "var(--text-primary)" }}>
                  {actionLabel(entry)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {formatTime(entry.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
