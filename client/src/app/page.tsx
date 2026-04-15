"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Board from "@/components/Board";
import { SocketProvider } from "@/context/SocketContext";
import { KanbanIcon, ZapIcon, TargetIcon, ShieldIcon, SunIcon, MoonIcon } from "@/components/Icons";
import { useTheme } from "@/context/ThemeContext";
import BoardPasswordModal from "@/components/BoardPasswordModal";
import CreditsModal from "@/components/CreditsModal";
import AuthModal from "@/components/AuthModal";
import MyBoards from "@/components/MyBoards";
import { useAuth } from "@/context/AuthContext";
import { getBoardStatus, setupBoardPassword, verifyBoardPassword, verifyBoardBypass, claimBoardOwner, addMyBoard } from "@/lib/api";
import { REPO_UPDATES } from "@/lib/repoUpdates";

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

function getBypassToken(id: string): string | null {
  try { return localStorage.getItem(`board_bypass_${id}`); }
  catch { return null; }
}
function saveBypassToken(id: string, token: string) {
  try { localStorage.setItem(`board_bypass_${id}`, token); }
  catch { /* ignore */ }
}
function removeBypassToken(id: string) {
  try { localStorage.removeItem(`board_bypass_${id}`); }
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
  const [bypassToken, setBypassToken] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [joined, setJoined] = useState(false);
  const [recentBoards, setRecentBoards] = useState<string[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [modalError, setModalError] = useState("");
  const [showCredits, setShowCredits] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMyBoards, setShowMyBoards] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { user, token: authToken, loading: authLoading, logout } = useAuth();

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
      if (savedName.trim()) {
        // Defer past hydration so React doesn't see a server/client mismatch (#418)
        setTimeout(() => void handleJoin(sharedBoard, savedName), 0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When auth loads and user is logged in, prefer their username
  useEffect(() => {
    if (!authLoading && user) {
      setUserName((prev) => prev || user.username);
    }
  }, [authLoading, user]);

  async function syncOwnerState(id: string, name: string) {
    const existingOwnerToken = getOwnerToken(id);
    try {
      const result = await claimBoardOwner(id, name, existingOwnerToken, authToken);
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

      // Persist bypass token for the owner
      if (result.isOwner && result.bypassToken) {
        saveBypassToken(id, result.bypassToken);
        setBypassToken(result.bypassToken);
      } else if (result.isOwner) {
        const stored = getBypassToken(id);
        setBypassToken(stored);
      } else {
        setBypassToken(null);
      }

      return result;
    } catch {
      setOwnerName(null);
      setIsOwner(false);
      setOwnerToken(null);
      setBypassToken(null);
      return null;
    }
  }

  async function claimOwnerAndJoin(id: string, name: string, skipSync = false) {
    if (!skipSync) {
      await syncOwnerState(id, name);
    }
    saveRecentBoard(id);
    // Save to user's board list if logged in
    if (authToken) {
      addMyBoard(authToken, id).catch(() => {/* non-critical */});
    }
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
        // Check ownership FIRST — board owner is never asked for a password
        const ownerResult = await syncOwnerState(sanitized, name);
        if (ownerResult?.isOwner) {
          setBoardUnlocked(sanitized);
          await claimOwnerAndJoin(sanitized, name, true);
        } else {
          // Not the owner — check for bypass invite token in URL
          const urlParams = new URLSearchParams(window.location.search);
          const inviteToken = urlParams.get("invite");
          if (inviteToken) {
            try {
              const { valid } = await verifyBoardBypass(sanitized, inviteToken);
              if (valid) {
                setBoardUnlocked(sanitized);
                await claimOwnerAndJoin(sanitized, name, false);
                return;
              }
            } catch { /* fall through to password modal */ }
          }
          // Require password
          setBoardId(sanitized);
          setModalError("");
          setModal({ open: true, boardId: sanitized, mode: "verify" });
        }
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
      const result = await setupBoardPassword(id, password, ownerToken);
      if (result?.bypassToken) {
        saveBypassToken(id, result.bypassToken);
        setBypassToken(result.bypassToken);
      }
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
    setBypassToken(null);
    setIsOwner(false);
    setRecentBoards(getRecentBoards());
  }

  function handleLogout() {
    logout();
    if (boardId) {
      try { sessionStorage.removeItem(`board_auth_${boardId}`); } catch { /* ignore */ }
    }
    try { localStorage.removeItem("taskboard_username"); } catch { /* ignore */ }
    try { window.history.pushState({}, "", window.location.pathname); } catch { /* ignore */ }

    setJoined(false);
    setBoardId("");
    setInputValue("");
    setUserName("");
    setOwnerName(null);
    setOwnerToken(null);
    setBypassToken(null);
    setIsOwner(false);
    setShowAuth(false);
    setShowMyBoards(false);
    setModal({ open: false });
    setModalError("");
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
          bypassToken={bypassToken}
          isOwner={isOwner}
          onLeave={handleLeave}
          onLogout={user ? handleLogout : undefined}
          onShowMyBoards={user ? () => setShowMyBoards(true) : undefined}
        />
        {showMyBoards && (
          <MyBoards
            currentBoardId={boardId}
            onOpen={(id) => {
              // Switch board without leaving — re-use handleJoin
              void handleJoin(id, userName);
            }}
            onClose={() => setShowMyBoards(false)}
          />
        )}
      </SocketProvider>
    );
  }

  return (
    <>
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Top-right controls: theme + auth */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10 flex-wrap justify-end">
        <Link
          href="/updates"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", boxShadow: "var(--shadow)" }}
        >
          Updates
        </Link>
        <Link
          href="/feedback"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", boxShadow: "var(--shadow)" }}
        >
          Feedback
        </Link>
        {/* Auth button */}
        {!authLoading && (
          user ? (
            <>
              <button
                onClick={() => setShowMyBoards(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--accent-indigo)",
                  boxShadow: "var(--shadow)",
                }}
                title="My Boards"
              >
                <KanbanIcon size={13} />
                @{user.username}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--accent-red)",
                  boxShadow: "var(--shadow)",
                }}
                title="Log Out"
              >
                Log Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                border: "none",
                boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
              }}
            >
              Sign In
            </button>
          )
        )}
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow)",
          }}
        >
          {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
      </div>
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

        {/* Latest updates */}
        <div
          className="glass rounded-2xl p-4 mt-4 animate-fade-in"
          style={{ boxShadow: "var(--shadow)", animationDelay: "0.12s" }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Latest System Updates
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                This section shows the newest features included in the latest repo push.
              </p>
            </div>
            <div
              className="px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0"
              style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent-indigo)" }}
            >
              Live Notes
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {REPO_UPDATES.slice(0, 1).map((update) => (
              <div
                key={update.id}
                className="rounded-xl p-3"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {update.summary}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {update.timestamp}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {update.details.map((item) => (
                    <li key={item} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--accent-indigo)" }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link href="/updates" className="text-xs font-semibold" style={{ color: "var(--accent-indigo)" }}>
                    View full timeline →
                  </Link>
                </div>
              </div>
            ))}
          </div>
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

    {/* Auth modal */}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

    {/* My Boards panel */}
    {showMyBoards && (
      <MyBoards
        onOpen={(id) => {
          setShowMyBoards(false);
          void handleJoin(id, userName);
        }}
        onClose={() => setShowMyBoards(false)}
      />
    )}
  </>
  );
}
