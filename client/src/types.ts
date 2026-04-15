export interface Task {
  _id: string;
  title: string;
  description: string;
  column: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "critical";
  dueDate: string | null;
  order: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
}

export type ColumnId = "todo" | "in-progress" | "done";
export type Priority = "low" | "medium" | "high" | "critical";

export interface ColumnDef {
  id: ColumnId;
  title: string;
  color: string;
  gradient: string;
}

export interface ChatMessage {
  id: string;
  type: "user" | "system";
  senderName?: string;
  senderId?: string;
  text: string;
  timestamp: number;
}

export type ActivityAction =
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "task:moved"
  | "member:joined"
  | "member:left";

export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  userName: string;
  taskTitle?: string;
  fromColumn?: string;
  toColumn?: string;
  detail?: string;
  timestamp: number;
}

export const COLUMNS: ColumnDef[] = [
  { id: "todo",        title: "To Do",      color: "#6366f1", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
  { id: "in-progress", title: "In Progress", color: "#f59e0b", gradient: "linear-gradient(135deg,#f59e0b,#ef4444)" },
  { id: "done",        title: "Done",        color: "#10b981", gradient: "linear-gradient(135deg,#10b981,#06b6d4)" },
];

export const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  high:     { label: "High",     color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  medium:   { label: "Medium",   color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  low:      { label: "Low",      color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
} as const;
