"use client";

import Link from "next/link";
import { REPO_UPDATES } from "@/lib/repoUpdates";
import { HistoryIcon, ArrowLeftIcon, KanbanIcon } from "@/components/Icons";

export default function UpdatesPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              System Updates Timeline
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              A full timeline of the recent updates pushed to the repository.
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <ArrowLeftIcon size={14} />
            Home
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {REPO_UPDATES.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl p-4 sm:p-5"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent-indigo)" }}
                  >
                    <HistoryIcon size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      {entry.summary}
                    </h2>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {entry.version}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {entry.timestamp}
                </div>
              </div>

              <ul className="flex flex-col gap-2 ml-1">
                {entry.details.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--accent-indigo)" }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/feedback"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
          >
            <KanbanIcon size={14} />
            Leave Feedback
          </Link>
        </div>
      </div>
    </div>
  );
}
