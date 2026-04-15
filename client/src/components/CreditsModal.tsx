"use client";

import { XIcon, KanbanIcon, ZapIcon, ShieldIcon, TargetIcon } from "./Icons";

const TECH_STACK = [
  { name: "Next.js 15",         role: "Frontend framework"          },
  { name: "React 19",           role: "UI library"                  },
  { name: "TypeScript",         role: "Type safety"                 },
  { name: "Tailwind CSS 4",     role: "Styling"                     },
  { name: "Socket.io",          role: "Real-time communication"     },
  { name: "Node.js + Express",  role: "Backend server"              },
  { name: "MongoDB Atlas",      role: "Database"                    },
  { name: "Mongoose",           role: "ODM / data modeling"         },
  { name: "@dnd-kit",           role: "Drag and drop"               },
  { name: "bcryptjs",           role: "Password hashing"            },
];

const FEATURES = [
  { Icon: ZapIcon,    label: "Real-time sync via Socket.io"  },
  { Icon: TargetIcon, label: "Drag & drop kanban board"      },
  { Icon: ShieldIcon, label: "Board password protection"     },
  { Icon: KanbanIcon, label: "Dark / light theme"            },
];

export default function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        {/* ── Header banner ── */}
        <div
          className="relative px-6 pt-8 pb-6 flex flex-col items-center text-center"
          style={{
            background: "linear-gradient(160deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg-primary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            <XIcon size={13} />
          </button>

          {/* Profile picture */}
          <div
            className="relative mb-4"
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)",
            }}
          >
            <div style={{ borderRadius: "50%", overflow: "hidden", width: "100%", height: "100%", background: "var(--bg-secondary)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/primo.jpg"
                alt="Primo Velasquez"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                onError={(e) => {
                  e.currentTarget.src = "/primo-placeholder.svg";
                }}
              />
            </div>
            {/* Online badge */}
            <span
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
              style={{
                background: "var(--accent-green)",
                borderColor: "var(--bg-card)",
                boxShadow: "0 0 8px #10b981",
              }}
            />
          </div>

          {/* Name + role */}
          <h2
            className="text-xl font-extrabold tracking-tight mb-1"
            style={{
              background: "linear-gradient(135deg,#e4ecf8,#a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Primo Velasquez
          </h2>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--accent-indigo)" }}>
            Full-Stack Developer
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)", maxWidth: 300, lineHeight: 1.6 }}>
            Designed and built this real-time collaborative task board from scratch — backend, frontend, and real-time infrastructure.
          </p>
        </div>

        {/* ── Project info ── */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <KanbanIcon size={14} style={{ color: "#fff" }} />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Real-Time Collaborative Task Board
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            A full-stack kanban app with real-time collaboration, board password protection, drag-and-drop task management, dark/light mode, and cloud persistence.
          </p>

          {/* Key features */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {FEATURES.map(({ Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                <span style={{ color: "var(--accent-indigo)", flexShrink: 0 }}>
                  <Icon size={13} />
                </span>
                {label}
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Tech Stack
          </p>
          <div className="flex flex-wrap gap-1.5 mb-6">
            {TECH_STACK.map(({ name, role }) => (
              <span
                key={name}
                title={role}
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(99,102,241,0.1)",
                  color: "var(--accent-indigo)",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 Primo Velasquez
          </span>
          <button
            onClick={onClose}
            className="btn-primary text-xs px-4 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
