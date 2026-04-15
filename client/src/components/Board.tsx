"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";

import Column from "./Column";
import TaskCard from "./TaskCard";
import AddTaskForm from "./AddTaskForm";
import TaskModal from "./TaskModal";
import Chat from "./Chat";
import ActivityPanel from "./ActivityPanel";
import MembersPanel from "./MembersPanel";
import BoardPasswordModal from "./BoardPasswordModal";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/context/ToastContext";
import { fetchTasks, getBoardStatus, moveTask, setupBoardPassword, removeBoardPassword } from "@/lib/api";
import { Task, ChatMessage, ActivityEntry, COLUMNS, ColumnId, Priority } from "@/types";
import {
  KanbanIcon, UsersIcon, SearchIcon, XIcon,
  ArrowLeftIcon, FilterIcon, SortIcon, CopyIcon, SunIcon, MoonIcon,
  MessageIcon, LockIcon, UnlockIcon, HistoryIcon,
} from "./Icons";
import { useTheme } from "@/context/ThemeContext";

type SortMode = "order" | "priority" | "dueDate" | "created";
const SORT_LABELS: Record<SortMode, string> = {
  order:    "Default",
  priority: "Priority",
  dueDate:  "Due Date",
  created:  "Newest",
};
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function Board({ boardId, userName, ownerName, ownerToken, bypassToken, isOwner, onLeave, onLogout, onShowMyBoards }: {
  boardId: string;
  userName: string;
  ownerName: string | null;
  ownerToken: string | null;
  bypassToken?: string | null;
  isOwner: boolean;
  onLeave: () => void;
  onLogout?: () => void;
  onShowMyBoards?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [members, setMembers] = useState<string[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProtected, setIsProtected] = useState(false);
  const [pwModal, setPwModal] = useState<"setup" | "remove" | null>(null);
  const [pwError, setPwError] = useState("");
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("order");
  const [sortOpen, setSortOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const socket = useSocket();
  const { toast } = useToast();
  const { theme, toggle: toggleTheme } = useTheme();

  const loadTasks = useCallback(async () => {
    try {
      const data = await fetchTasks(boardId);
      setTasks(data);
    } catch {
      toast("Failed to load tasks", "error");
    }
  }, [boardId, toast]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;

    async function loadBoardStatus() {
      try {
        const status = await getBoardStatus(boardId);
        if (!cancelled) setIsProtected(status.protected);
      } catch {
        if (!cancelled) setIsProtected(false);
      }
    }

    void loadBoardStatus();
    return () => { cancelled = true; };
  }, [boardId]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUsers      = (n: number) => setUserCount(n);
    const onMembers    = (m: string[]) => setMembers(m);

    const onTaskCreated = (task: Task) =>
      setTasks((prev) => prev.find((t) => t._id === task._id) ? prev : [...prev, task]);

    const onTaskUpdated = (task: Task) =>
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));

    const onTaskDeleted = ({ id }: { id: string }) =>
      setTasks((prev) => prev.filter((t) => t._id !== id));

    const onBoardUpdated = (all: Task[]) => setTasks(all);

    const onChatHistory = (msgs: ChatMessage[]) => setChatMessages(msgs);
    const onActivityHistory = (entries: ActivityEntry[]) => {
      setActivityLog(entries.filter((entry, index, arr) => arr.findIndex((item) => item.id === entry.id) === index));
    };
    const onActivityLog = (entry: ActivityEntry) => {
      setActivityLog((prev) => prev.some((item) => item.id === entry.id) ? prev : [...prev, entry]);
    };
    const onChatMessage = (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      // Show toast for other users' join/leave events
      if (msg.type === "system" && msg.text && !msg.text.startsWith(userName)) {
        toast(msg.text, "info");
      }
      // Only actual user messages count as "unread" — not join/leave system events
      if (msg.type === "user") {
        setChatOpen((open) => {
          if (!open) setUnreadCount((n) => n + 1);
          return open;
        });
      }
    };

    socket.on("connect",        onConnect);
    socket.on("disconnect",     onDisconnect);
    socket.on("room:users",     onUsers);
    socket.on("room:members",   onMembers);
    socket.on("task:created",   onTaskCreated);
    socket.on("task:updated",   onTaskUpdated);
    socket.on("task:deleted",   onTaskDeleted);
    socket.on("board:updated",  onBoardUpdated);
    socket.on("chat:history",    onChatHistory);
    socket.on("chat:message",    onChatMessage);
    socket.on("activity:history", onActivityHistory);
    socket.on("activity:log",     onActivityLog);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off("connect",        onConnect);
      socket.off("disconnect",     onDisconnect);
      socket.off("room:users",     onUsers);
      socket.off("room:members",   onMembers);
      socket.off("task:created",   onTaskCreated);
      socket.off("task:updated",   onTaskUpdated);
      socket.off("task:deleted",   onTaskDeleted);
      socket.off("board:updated",  onBoardUpdated);
      socket.off("chat:history",    onChatHistory);
      socket.off("chat:message",    onChatMessage);
      socket.off("activity:history", onActivityHistory);
      socket.off("activity:log",     onActivityLog);
    };
  }, [socket, userName, toast]);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return;
    const handler = () => setSortOpen(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  // DnD sensors — PointerSensor for mouse, TouchSensor for mobile, KeyboardSensor for a11y
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Custom collision: prefer pointer-within droppables, fall back to rect intersection
  const collisionDetection = useCallback(
    (args: Parameters<typeof pointerWithin>[0]) => {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) return pointerCollisions;
      return rectIntersection(args);
    },
    []
  );

  const q = search.trim().toLowerCase();

  function getTasksByColumn(column: ColumnId) {
    let filtered = tasks.filter((t) => {
      if (t.column !== column) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortMode === "priority") {
      filtered = [...filtered].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    } else if (sortMode === "dueDate") {
      filtered = [...filtered].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortMode === "created") {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      filtered = [...filtered].sort((a, b) => a.order - b.order);
    }

    return filtered;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t._id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId   = over.id as string;
    const activeTaskItem = tasks.find((t) => t._id === activeId);
    if (!activeTaskItem) return;
    const overTask   = tasks.find((t) => t._id === overId);
    const overColumn = (overTask ? overTask.column : overId) as ColumnId;
    if (activeTaskItem.column !== overColumn) {
      setTasks((prev) => prev.map((t) => t._id === activeId ? { ...t, column: overColumn } : t));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId   = over.id as string;
    const activeTaskItem = tasks.find((t) => t._id === activeId);
    if (!activeTaskItem) return;

    const overTask     = tasks.find((t) => t._id === overId);
    const targetColumn = (overTask ? overTask.column : overId) as ColumnId;
    const columnTasks  = getTasksByColumn(targetColumn);
    let newOrder: number;

    if (overTask) {
      const overIndex   = columnTasks.findIndex((t) => t._id === overId);
      const activeIndex = columnTasks.findIndex((t) => t._id === activeId);
      if (activeIndex !== -1 && overIndex !== -1) {
        newOrder = arrayMove(columnTasks, activeIndex, overIndex).findIndex((t) => t._id === activeId);
      } else {
        newOrder = overIndex >= 0 ? overIndex : columnTasks.length;
      }
    } else {
      newOrder = columnTasks.length;
    }

    try {
      await moveTask(activeId, { column: targetColumn, order: newOrder, userName });
    } catch {
      toast("Failed to move task", "error");
      loadTasks();
    }
  }

  function handleCopyLink() {
    const text = typeof window !== "undefined"
      ? `${window.location.origin}?board=${boardId}`
      : boardId;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setShareOpen(false);
      toast("Board link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast("Could not copy link", "error"));
  }

  function handleCopyBypassLink() {
    if (!bypassToken) return;
    const text = typeof window !== "undefined"
      ? `${window.location.origin}?board=${boardId}&invite=${bypassToken}`
      : boardId;
    navigator.clipboard.writeText(text).then(() => {
      setShareOpen(false);
      toast("Open invite link copied! Anyone with this link can join without a password.", "success");
    }).catch(() => toast("Could not copy link", "error"));
  }

  // Progress stats
  const totalTasks = tasks.length;
  const doneTasks  = tasks.filter((t) => t.column === "done").length;
  const donePercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const PRIORITIES: Array<Priority | "all"> = ["all", "critical", "high", "medium", "low"];
  const PRIORITY_LABELS: Record<string, string> = { all: "All", critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  const PRIORITY_COLORS: Record<string, string> = { all: "var(--text-secondary)", critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#22c55e" };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header
        className="px-3 sm:px-5 py-2.5 flex items-center justify-between border-b shrink-0"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {/* Left: logo + board id + progress */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <KanbanIcon size={16} style={{ color: "#fff" }} />
          </div>
          <span className="font-bold text-sm sm:text-base truncate">TaskBoard</span>
          <span
            className="px-2 py-0.5 rounded-lg text-xs font-semibold shrink-0 truncate"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              maxWidth: "9rem",
            }}
            title={boardId}
          >
            {boardId}
          </span>
          {/* Owner badge */}
          {ownerName && (
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs shrink-0"
              style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent-indigo)", border: "1px solid rgba(99,102,241,0.25)" }}
              title={isOwner ? "You are the board owner" : `Board owner: ${ownerName}`}
            >
              <LockIcon size={11} />
              {isOwner ? "Owner" : ownerName}
            </span>
          )}
          {/* Progress — hidden on very small screens */}
          {totalTasks > 0 && (
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${donePercent}%`, background: "linear-gradient(90deg,#6366f1,#10b981)" }}
                />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{donePercent}%</span>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Share — dropdown for owner with bypass token, simple button otherwise */}
          {isOwner && isProtected && bypassToken ? (
            <div className="relative">
              <button
                onClick={() => setShareOpen((v) => !v)}
                title="Share board"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{
                  background: shareOpen ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                  color: shareOpen ? "var(--accent-indigo)" : "var(--text-secondary)",
                  border: `1px solid ${shareOpen ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                  transition: "all 0.2s",
                }}
              >
                <CopyIcon size={13} />
                <span className="hidden sm:inline">Share</span>
              </button>
              {shareOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50 min-w-[200px]"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.2))" }}
                >
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer transition-colors hover:bg-indigo-500/10 text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <CopyIcon size={12} />
                    <div>
                      <div className="font-medium">Copy Link</div>
                      <div className="text-xs opacity-60">Requires password to join</div>
                    </div>
                  </button>
                  <div style={{ height: 1, background: "var(--border)" }} />
                  <button
                    onClick={handleCopyBypassLink}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer transition-colors hover:bg-indigo-500/10 text-left"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <UnlockIcon size={12} />
                    <div>
                      <div className="font-medium">Copy Open Link</div>
                      <div className="text-xs opacity-60">Anyone with link joins instantly</div>
                    </div>
                  </button>
                </div>
              )}
              {/* Click-away to close */}
              {shareOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
              )}
            </div>
          ) : (
            <button
              onClick={handleCopyLink}
              title="Copy board link"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background: copied ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                color: copied ? "var(--accent-indigo)" : "var(--text-secondary)",
                border: `1px solid ${copied ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                transition: "all 0.2s",
              }}
            >
              <CopyIcon size={13} />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
          )}

          {/* Online users — icon-only on mobile */}
          <div
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            <UsersIcon size={13} />
            <span className="hidden sm:inline">{userCount} online</span>
            <span className="sm:hidden">{userCount}</span>
          </div>

          {/* Chat toggle */}
          <button
            onClick={() => { setChatOpen((v) => !v); setUnreadCount(0); }}
            title="Board chat"
            className="relative flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              background: chatOpen ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
              color: chatOpen ? "var(--accent-indigo)" : "var(--text-secondary)",
              border: `1px solid ${chatOpen ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              transition: "all 0.2s",
            }}
          >
            <MessageIcon size={13} />
            <span className="hidden sm:inline">Chat</span>
            {unreadCount > 0 && !chatOpen && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style={{ background: "#ef4444", fontSize: 9, fontWeight: 700 }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Members panel button */}
          <button
            onClick={() => { setMembersOpen((v) => !v); if (activityOpen) setActivityOpen(false); }}
            title="Board members"
            className="relative flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              background: membersOpen ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
              color: membersOpen ? "var(--accent-indigo)" : "var(--text-secondary)",
              border: `1px solid ${membersOpen ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              transition: "all 0.2s",
            }}
          >
            <UsersIcon size={13} />
            <span className="hidden sm:inline">Members</span>
          </button>

          {/* Activity log button */}
          <button
            onClick={() => { setActivityOpen((v) => { if (!v && membersOpen) setMembersOpen(false); return !v; }); }}
            title="Board activity"
            className="relative flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{
              background: activityOpen ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
              color: activityOpen ? "var(--accent-indigo)" : "var(--text-secondary)",
              border: `1px solid ${activityOpen ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              transition: "all 0.2s",
            }}
          >
            <HistoryIcon size={13} />
            <span className="hidden sm:inline">Activity</span>
          </button>

          {/* Owner password management */}
          {isOwner && (
            <button
              onClick={() => { setPwError(""); setPwModal(isProtected ? "remove" : "setup"); }}
              title={isProtected ? "Remove board password" : "Set board password"}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background: "var(--bg-card)",
                color: isProtected ? "var(--accent-indigo)" : "var(--text-secondary)",
                border: `1px solid ${isProtected ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
                transition: "all 0.2s",
              }}
            >
              {isProtected ? <UnlockIcon size={13} /> : <LockIcon size={13} />}
              <span className="hidden sm:inline">{isProtected ? "Unlock" : "Lock"}</span>
            </button>
          )}

          {/* Connection dot */}
          <div className="flex items-center gap-1 text-xs px-2 py-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{
                background: connected ? "var(--accent-green)" : "var(--accent-red)",
                boxShadow: connected ? "0 0 6px #10b981" : "0 0 6px #ef4444",
              }}
            />
            <span className="hidden sm:inline" style={{ color: "var(--text-secondary)" }}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>

          {/* Leave */}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 btn-secondary text-xs px-2 sm:px-3 py-1.5 shrink-0"
          >
            <ArrowLeftIcon size={12} />
            <span className="hidden sm:inline">Leave</span>
          </button>

          {/* My Boards (only if logged in) */}
          {onShowMyBoards && (
            <button
              onClick={onShowMyBoards}
              title="My Boards"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0"
              style={{
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <KanbanIcon size={13} />
              <span className="hidden sm:inline">My Boards</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              title="Log Out"
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0"
              style={{
                background: "var(--bg-card)",
                color: "var(--accent-red)",
                border: "1px solid var(--border)",
              }}
            >
              <span>Log Out</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div
        className="px-3 sm:px-5 py-2 flex flex-col gap-2 border-b shrink-0"
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {/* Row 1: Search + Sort */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            >
              <SearchIcon size={13} />
            </span>
            <input
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                <XIcon size={11} />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setSortOpen((v) => !v); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{
                background: sortMode !== "order" ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                color: sortMode !== "order" ? "var(--accent-indigo)" : "var(--text-secondary)",
                border: `1px solid ${sortMode !== "order" ? "rgba(99,102,241,0.4)" : "var(--border)"}`,
              }}
              title="Sort tasks"
            >
              <SortIcon size={13} />
              <span className="hidden sm:inline">{SORT_LABELS[sortMode]}</span>
            </button>
            {sortOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30 animate-scale-in"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-lg)",
                  minWidth: 140,
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setSortMode(mode); setSortOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium cursor-pointer"
                    style={{
                      background: sortMode === mode ? "rgba(99,102,241,0.15)" : "transparent",
                      color: sortMode === mode ? "var(--accent-indigo)" : "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => { if (sortMode !== mode) e.currentTarget.style.background = "var(--bg-card)"; }}
                    onMouseLeave={(e) => { if (sortMode !== mode) e.currentTarget.style.background = "transparent"; }}
                  >
                    {SORT_LABELS[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Add task form — full width */}
        <AddTaskForm boardId={boardId} userName={userName} />

        {/* Row 3: Priority filter chips — horizontal scroll */}
        <div
          className="flex items-center gap-1.5 pb-0.5"
          style={{ overflowX: "auto", scrollbarWidth: "none" } as React.CSSProperties}
        >
          <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            <FilterIcon size={12} />
          </span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all shrink-0"
              style={{
                background: filterPriority === p
                  ? (p === "all" ? "rgba(99,102,241,0.2)" : `${PRIORITY_COLORS[p]}22`)
                  : "var(--bg-card)",
                color: filterPriority === p
                  ? (p === "all" ? "var(--accent-indigo)" : PRIORITY_COLORS[p])
                  : "var(--text-muted)",
                border: filterPriority === p
                  ? `1px solid ${p === "all" ? "rgba(99,102,241,0.4)" : PRIORITY_COLORS[p] + "55"}`
                  : "1px solid var(--border)",
              }}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
          {(filterPriority !== "all" || sortMode !== "order") && (
            <button
              onClick={() => { setFilterPriority("all"); setSortMode("order"); }}
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer shrink-0"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)", background: "transparent" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Columns ── */}
      {/* On mobile: horizontal snap-scroll between columns */}
      {/* On desktop: normal overflow-auto (columns have internal scroll) */}
      <div
        className="flex-1 min-h-0 overflow-auto"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex md:grid md:grid-cols-3 gap-4 p-4"
            style={{
              height: "100%",
              minHeight: "100%",
              /* On mobile each column is 82vw; on desktop grid takes over */
            }}
          >
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="board-col flex flex-col"
              >
                <Column
                  column={col}
                  tasks={getTasksByColumn(col.id)}
                  boardId={boardId}
                  onOpenModal={setModalTask}
                />
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Task Modal ── */}
      {modalTask && (
        <TaskModal
          task={modalTask}
          userName={userName}
          onClose={() => setModalTask(null)}
          onSaved={(updated) =>
            setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)))
          }
        />
      )}

      {chatOpen && socket && (
        <Chat
          socket={socket}
          boardId={boardId}
          userName={userName}
          members={members}
          messages={chatMessages}
          onClose={() => { setChatOpen(false); setUnreadCount(0); }}
        />
      )}

      {pwModal && (
        <BoardPasswordModal
          boardId={boardId}
          mode={pwModal === "setup" ? "setup" : "verify"}
          onSuccess={() => {}}
          onCancel={() => { setPwModal(null); setPwError(""); }}
          error={pwError}
          titleOverride={pwModal === "setup" ? "Protect This Board" : "Remove Board Password"}
          descOverride={pwModal === "setup"
            ? "Set a password so only people with the password can access this board."
            : "Enter the current password to remove board protection for everyone."}
          submitLabelOverride={pwModal === "setup" ? "Set Password" : "Remove Password"}
          onSubmit={async (password) => {
            if (!ownerToken) {
              setPwError("Only the board owner can manage the board password.");
              return;
            }

            try {
              if (pwModal === "setup") {
                await setupBoardPassword(boardId, password, ownerToken);
                setIsProtected(true);
                toast("Board password set", "success");
              } else {
                await removeBoardPassword(boardId, password, ownerToken);
                setIsProtected(false);
                toast("Board password removed", "success");
              }
              setPwError("");
              setPwModal(null);
            } catch (error) {
              setPwError(error instanceof Error ? error.message : "Failed to update board password");
            }
          }}
        />
      )}

      {/* Members slide-over panel */}
      {membersOpen && (
        <MembersPanel
          members={members}
          userName={userName}
          ownerName={ownerName ?? null}
          onClose={() => setMembersOpen(false)}
        />
      )}

      {/* Activity log slide-over panel */}
      {activityOpen && (
        <ActivityPanel
          entries={activityLog}
          onClose={() => setActivityOpen(false)}
        />
      )}
    </div>
  );
}

