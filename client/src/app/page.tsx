"use client";

import { useEffect, useState } from "react";
import Board from "@/components/Board";
import { SocketProvider } from "@/context/SocketContext";
import { KanbanIcon, ZapIcon, TargetIcon, ShieldIcon, SunIcon, MoonIcon } from "@/components/Icons";
import { useTheme } from "@/context/ThemeContext";
import BoardPasswordModal from "@/components/BoardPasswordModal";
import CreditsModal from "@/components/CreditsModal";
import { getBoardStatus, setupBoardPassword, verifyBoardPassword, claimBoardOwner } from "@/lib/api";

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

function getOwnerToken(id: string): string | null {
  try { return localStorage.getItem(`board_owner_${id}`); }
  catch { return null; }
}
function saveOwnerToken(id: string, token: string) {
  try { localStorage.setItem(`board_owner_${id}`, token); }
  catch { /* ignore */ }
}
function removeOwnerToken(id: string) {
  try { localStorage.removeItem(`board_owner_${id}`); }
  catch { /* ignore */ }
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
  const [userName, setUserName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [joined, setJoined] = useState(false);
  const [recentBoards, setRecentBoards] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [modalError, setModalError] = useState("");
  const [showCredits, setShowCredits] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    setRecentBoards(getRecentBoards());
    let savedName = "";
    try {
      savedName = localStorage.getItem("taskboard_username") || "";
      if (savedName) setUserName(savedName);
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search);
    const sharedBoard = params.get("board");
    if (sharedBoard) {
      setInputValue(sharedBoard);
      // Pre-fill only — auto-joining here causes React hydration mismatch (#418)
      // because SSR renders the landing page while the client would switch to Board view.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncOwnerState(id: string, name: string) {
    const existingOwnerToken = getOwnerToken(id);
    try {
      const result = await claimBoardOwner(id, name, existingOwnerToken);
      setOwnerName(result.ownerName);
      setIsOwner(result.isOwner);

      if (result.ownerToken) {
        saveOwnerToken(id, result.ownerToken);
        setOwnerToken(result.ownerToken);
      } else if (result.isOwner && existingOwnerToken) {
        setOwnerToken(existingOwnerToken);
      } else {
        removeOwnerToken(id);
        setOwnerToken(null);
      }

      return result;
    } catch {
      setOwnerName(null);
      setIsOwner(false);
      setOwnerToken(null);
      return null;
    }
  }

  async function claimOwnerAndJoin(id: string, name: string, skipSync = false) {
    if (!skipSync) {
      await syncOwnerState(id, name);
    }
    saveRecentBoard(id);
    setBoardId(id);
    window.history.pushState({}, "", `?board=${encodeURIComponent(id)}`);
    setJoined(true);
  }

  async function handleJoin(id?: string, providedName?: string) {
    const name = (providedName ?? userName).trim();
    if (!name) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setUserName(name);
    // Save name to localStorage
    try { localStorage.setItem("taskboard_username", name); } catch { /* ignore */ }

    const raw = (id ?? inputValue).trim();
    const sanitized = raw.replace(/[^a-zA-Z0-9-_]/g, "") || "default";

    // If already unlocked this session, join directly
    if (isBoardUnlocked(sanitized)) {
      await claimOwnerAndJoin(sanitized, name);
      return;
    }

    // Check board password status
    try {
      const status = await getBoardStatus(sanitized);
      setOwnerName(status.ownerName);
      setIsOwner(false);
      if (status.protected) {
        // Board has a password — show verify modal
        setBoardId(sanitized);
        setModalError("");
        setModal({ open: true, boardId: sanitized, mode: "verify" });
      } else {
        const ownerResult = await syncOwnerState(sanitized, name);
        if (ownerResult?.isOwner) {
          // New or returning owner can decide whether to protect the board.
          setBoardId(sanitized);
          setModalError("");
          setModal({ open: true, boardId: sanitized, mode: "setup" });
        } else {
          setBoardUnlocked(sanitized);
          await claimOwnerAndJoin(sanitized, name, true);
        }
      }
    } catch {
      // If status check fails, allow entry without password
      await claimOwnerAndJoin(sanitized, name);
    }
  }

  async function handleModalSubmit(password: string) {
    if (!modal.open) return;
    const { boardId: id, mode } = modal;
    setModalError("");

    if (mode === "setup") {
      await setupBoardPassword(id, password, ownerToken);
      setBoardUnlocked(id);
      setModal({ open: false });
      await claimOwnerAndJoin(id, userName.trim());
    } else {
      const { valid } = await verifyBoardPassword(id, password);
      if (!valid) {
        setModalError("Incorrect password. Please try again.");
        return;
      }
      setBoardUnlocked(id);
      setModal({ open: false });
      await claimOwnerAndJoin(id, userName.trim());
    }
  }

  async function handleModalCancel() {
    if (!modal.open) return;
    const { boardId: id, mode } = modal;
    if (mode === "setup") {
      // User skipped setting a password — enter board without one
      setBoardUnlocked(id);
      setModal({ open: false });
      await claimOwnerAndJoin(id, userName.trim());
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
    setOwnerName(null);
    setOwnerToken(null);
    setIsOwner(false);
    setRecentBoards(getRecentBoards());
  }

  function handleRemoveRecent(e: React.MouseEvent, b: string) {
    e.stopPropagation();
    removeRecentBoard(b);
    setRecentBoards(getRecentBoards());
  }

  if (joined) {
    return (
      <SocketProvider boardId={boardId} userName={userName}>
        <Board
          boardId={boardId}
          userName={userName}
          ownerName={ownerName}
          ownerToken={ownerToken}
          isOwner={isOwner}
          onLeave={handleLeave}
        />
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
          <label className="field-label">Your Name <span style={{ color: "var(--accent-red)" }}>*</span></label>
          <input
            className="field-input text-base mb-1"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => { setUserName(e.target.value); if (nameError) setNameError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={60}
            autoFocus
            autoComplete="name"
          />
          {nameError && (
            <p className="text-xs mb-3" style={{ color: "var(--accent-red)" }}>Name is required</p>
          )}
          {!nameError && <div className="mb-3" />}
          <label className="field-label">Board Name</label>
          <input
            className="field-input text-base mb-4"
            placeholder="e.g. my-team, sprint-12, design-review…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            maxLength={50}
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
