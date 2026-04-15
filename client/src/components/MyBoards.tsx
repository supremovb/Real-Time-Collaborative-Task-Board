"use client";

import { useEffect, useState } from "react";
import { getMyBoards, removeMyBoard, UserBoard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { KanbanIcon, XIcon, TrashIcon, LockIcon, ArrowLeftIcon } from "./Icons";

export default function MyBoards({
  currentBoardId,
  onOpen,
  onClose,
}: {
  currentBoardId?: string;
  onOpen: (boardId: string) => void;
  onClose: () => void;
}) {
  const { user, token } = useAuth();
  const [boards, setBoards] = useState<UserBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getMyBoards(token)
      .then((r) => setBoards(r.boards))
      .catch(() => setBoards([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRemove(e: React.MouseEvent, boardId: string) {
    e.stopPropagation();
    if (!token) return;
    setRemoving(boardId);
    try {
      await removeMyBoard(token, boardId);
      setBoards((prev) => prev.filter((b) => b.boardId !== boardId));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl animate-fade-in flex flex-col"
        style={{
          maxWidth: 480,
          maxHeight: "80vh",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              My Boards
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Signed in as <span className="font-semibold" style={{ color: "var(--accent-indigo)" }}>@{user?.username}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <XIcon size={13} />
          </button>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "var(--accent-indigo)", borderTopColor: "transparent" }}
              />
            </div>
          )}

          {!loading && boards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.1)" }}
              >
                <KanbanIcon size={22} style={{ color: "var(--accent-indigo)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No boards yet</p>
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                Open a board and it will appear here automatically.
              </p>
            </div>
          )}

          {!loading && boards.map((b) => {
            const isCurrent = b.boardId === currentBoardId;
            return (
              <div
                key={b.boardId}
                role="button"
                tabIndex={0}
                onClick={() => { onOpen(b.boardId); onClose(); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { onOpen(b.boardId); onClose(); } }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all"
                style={{
                  background: isCurrent ? "rgba(99,102,241,0.12)" : "var(--bg-secondary)",
                  border: `1px solid ${isCurrent ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isCurrent
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "var(--bg-card)",
                    border: isCurrent ? "none" : "1px solid var(--border)",
                  }}
                >
                  <KanbanIcon size={16} style={{ color: isCurrent ? "#fff" : "var(--text-muted)" }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: isCurrent ? "var(--accent-indigo)" : "var(--text-primary)" }}
                    >
                      {b.boardId}
                    </span>
                    {isCurrent && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                      >
                        current
                      </span>
                    )}
                    {b.isOwner && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent-indigo)" }}
                      >
                        owner
                      </span>
                    )}
                    {b.protected && (
                      <LockIcon size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    )}
                  </div>
                  {b.ownerName && !b.isOwner && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      by {b.ownerName}
                    </p>
                  )}
                </div>

                {/* Switch indicator or remove */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {!isCurrent && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      <ArrowLeftIcon size={13} style={{ transform: "rotate(180deg)" }} />
                    </span>
                  )}
                  <button
                    onClick={(e) => handleRemove(e, b.boardId)}
                    disabled={removing === b.boardId}
                    className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                    title="Remove from my boards"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
                  >
                    <TrashIcon size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            Boards are saved automatically when you open them.
          </p>
        </div>
      </div>
    </div>
  );
}
