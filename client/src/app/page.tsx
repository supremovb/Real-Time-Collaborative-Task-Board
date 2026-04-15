"use client";

import { useEffect, useState } from "react";
import Board from "@/components/Board";
import { SocketProvider } from "@/context/SocketContext";
import { KanbanIcon, ZapIcon, TargetIcon, ShieldIcon, SunIcon, MoonIcon } from "@/components/Icons";
import { useTheme } from "@/context/ThemeContext";
import BoardPasswordModal from "@/components/BoardPasswordModal";
import CreditsModal from "@/components/CreditsModal";
import { getBoardStatus, setupBoardPassword, verifyBoardPassword } from "@/lib/api";

const MAX_RECENT = 5;

function getRecentBoards(): string[] {
  try { return JSON.parse(localStorage.getItem("recentBoards") || "[]"); }
  catch { return []; }
}
function saveRecentBoard(id: string) {
  try {
    const list = getRecentBoards().filter((b) => b !== id);
    localStorage.setItem("recentBoards", JSON.stringify([id, ...list].slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}
function removeRecentBoard(id: string) {
  try {
    const list = getRecentBoards().filter((b) => b !== id);
    localStorage.setItem("recentBoards", JSON.stringify(list));
  } catch { /* ignore */ }
}

function isBoardUnlocked(id: string): boolean {
  try { return sessionStorage.getItem(`board_auth_${id}`) === "1"; }
  catch { return false; }
}
function setBoardUnlocked(id: string) {
  try { sessionStorage.setItem(`board_auth_${id}`, "1"); }
  catch { /* ignore */ }
}

const FEATURES = [
  { Icon: ZapIcon,    title: "Real-time",  desc: "Instant sync across all browsers" },
  { Icon: TargetIcon, title: "Drag & Drop", desc: "Move tasks between columns" },
  { Icon: ShieldIcon, title: "Secured",     desc: "Rate-limited & sanitized" },
];

type ModalState =
  | { open: false }
  | { open: true; boardId: string; mode: "setup" | "verify" };

export default function Home() {
  const [boardId, setBoardId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [joined, setJoined] = useState(false);
  const [recentBoards, setRecentBoards] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [modalError, setModalError] = useState("");
  const [showCredits, setShowCredits] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    setRecentBoards(getRecentBoards());
    // Auto-join from shared link: ?board=<boardId>
    const params = new URLSearchParams(window.location.search);
    const sharedBoard = params.get("board");
    if (sharedBoard) {
      handleJoin(sharedBoard);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(id?: string) {
    const raw = (id ?? inputValue).trim();
    const sanitized = raw.replace(/[^a-zA-Z0-9-_]/g, "") || "default";

    // If already unlocked this session, join directly
    if (isBoardUnlocked(sanitized)) {
      saveRecentBoard(sanitized);
      setBoardId(sanitized);
      window.history.pushState({}, "", `?board=${encodeURIComponent(sanitized)}`);
      setJoined(true);
      return;
    }

    // Check board password status
    try {
      const status = await getBoardStatus(sanitized);
      if (status.protected) {
        // Board has a password — show verify modal
        setBoardId(sanitized);
        setModalError("");
        setModal({ open: true, boardId: sanitized, mode: "verify" });
      } else {
        // No password yet — offer to set one (skippable)
        setBoardId(sanitized);
        setModalError("");
        setModal({ open: true, boardId: sanitized, mode: "setup" });
      }
    } catch {
      // If status check fails, allow entry without password
      saveRecentBoard(sanitized);
      setBoardId(sanitized);
      window.history.pushState({}, "", `?board=${encodeURIComponent(sanitized)}`);
      setJoined(true);
    }
  }

  async function handleModalSubmit(password: string) {
    if (!modal.open) return;
    const { boardId: id, mode } = modal;
    setModalError("");

    if (mode === "setup") {
      await setupBoardPassword(id, password);
      setBoardUnlocked(id);
      saveRecentBoard(id);
      setModal({ open: false });
      window.history.pushState({}, "", `?board=${encodeURIComponent(id)}`);
      setJoined(true);
    } else {
      const { valid } = await verifyBoardPassword(id, password);
      if (!valid) {
        setModalError("Incorrect password. Please try again.");
        return;
      }
      setBoardUnlocked(id);
      saveRecentBoard(id);
      setModal({ open: false });
      window.history.pushState({}, "", `?board=${encodeURIComponent(id)}`);
      setJoined(true);
    }
  }

  function handleModalCancel() {
    if (!modal.open) return;
    const { boardId: id, mode } = modal;
    if (mode === "setup") {
      // User skipped setting a password — enter board without one
      setBoardUnlocked(id);
      saveRecentBoard(id);
      setModal({ open: false });
      window.history.pushState({}, "", `?board=${encodeURIComponent(id)}`);
      setJoined(true);
    } else {
      // Verify cancelled — go back to landing
      setModal({ open: false });
      setBoardId("");
    }
  }

  function handleLeave() {
    // Clear session auth so the board requires password again on next visit
    if (boardId) {
      try { sessionStorage.removeItem(`board_auth_${boardId}`); } catch { /* ignore */ }
    }
    // Clean the URL so refresh goes back to landing
    window.history.pushState({}, "", window.location.pathname);
    setJoined(false);
    setInputValue("");
    setRecentBoards(getRecentBoards());
  }

  function handleRemoveRecent(e: React.MouseEvent, b: string) {
    e.stopPropagation();
    removeRecentBoard(b);
    setRecentBoards(getRecentBoards());
  }

  if (joined) {
    return (
      <SocketProvider boardId={boardId}>
        <Board boardId={boardId} onLeave={handleLeave} />
      </SocketProvider>
    );
  }

  return (
    <>
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="fixed top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer z-10"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow)",
        }}
      >
        {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
      </button>
      <div className="w-full" style={{ maxWidth: 480 }}>

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 0 48px rgba(99,102,241,0.45)",
            }}
          >
            <KanbanIcon size={30} style={{ color: "#fff" }} />
          </div>
          <h1
            className="text-4xl font-extrabold mb-2 tracking-tight"
            style={{
              background: "linear-gradient(135deg,#e4ecf8,#a5b4fc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            TaskBoard
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Real-time collaboration, zero friction
          </p>
        </div>

        {/* Join card */}
        <div
          className="glass rounded-2xl p-6 animate-fade-in"
          style={{ boxShadow: "var(--shadow-lg)", animationDelay: "0.05s" }}
        >
          <label className="field-label">Board Name</label>
          <input
            className="field-input text-base mb-4"
            placeholder="e.g. my-team, sprint-12, design-review…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={50}
            autoFocus
          />
          <button
            onClick={() => handleJoin()}
            className="w-full py-3 rounded-xl text-base font-semibold cursor-pointer transition-transform active:scale-95"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
            }}
          >
            Open Board
          </button>
          <p className="text-center text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Leave blank to use the default board
          </p>

          {/* Recent boards */}
          {recentBoards.length > 0 && (
            <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-secondary)" }}>
                Recent Boards
              </p>
              <div className="flex flex-wrap gap-2">
                {recentBoards.map((b) => (
                  <div key={b} className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <button
                      onClick={() => handleJoin(b)}
                      className="px-3 py-1.5 text-xs font-medium cursor-pointer"
                      style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      {b}
                    </button>
                    <button
                      onClick={(e) => handleRemoveRecent(e, b)}
                      className="px-2 py-1.5 text-xs cursor-pointer"
                      style={{ background: "var(--bg-primary)", color: "var(--text-muted)", borderLeft: "1px solid var(--border)" }}
                      title="Remove from recent"
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-red)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feature highlights */}
        <div
          className="grid grid-cols-3 gap-3 mt-4 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-3 text-center">
              <div className="flex justify-center mb-2" style={{ color: "var(--accent-indigo)" }}>
                <Icon size={20} />
              </div>
              <div className="text-xs font-semibold mb-0.5">{title}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Credits link */}
        <div className="text-center mt-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <button
            onClick={() => setShowCredits(true)}
            className="text-xs cursor-pointer"
            style={{ color: "var(--text-muted)", background: "none", border: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-indigo)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            Built by Primo Velasquez
          </button>
        </div>

      </div>
    </div>

    {/* Board password modal — fixed overlay, sits on top regardless of parent */}
    {modal.open && (
      <BoardPasswordModal
        boardId={modal.boardId}
        mode={modal.mode}
        onSuccess={() => {}}
        onCancel={handleModalCancel}
        error={modalError}
        onSubmit={handleModalSubmit}
      />
    )}

    {/* Credits modal */}
    {showCredits && <CreditsModal onClose={() => setShowCredits(false)} />}
  </>
  );
}
