"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, PRIORITY_CONFIG } from "@/types";
import { deleteTask } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { PencilIcon, TrashIcon, CheckIcon, CalendarIcon, GripIcon, AlertIcon } from "./Icons";

function formatDue(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { label: "Due today",   warn: true };
  if (diff === 1) return { label: "Due tomorrow", warn: false };
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), warn: false };
}

export default function TaskCard({
  task,
  isOverlay,
  onOpenModal,
}: {
  task: Task;
  isOverlay?: boolean;
  onOpenModal?: (task: Task) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id });

  const pConfig = PRIORITY_CONFIG[task.priority ?? "medium"];
  const due     = formatDue(task.dueDate);

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.35 : 1,
  };

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteTask(task._id);
      toast("Task deleted", "info");
    } catch {
      toast("Failed to delete task", "error");
    }
    setConfirmDelete(false);
  }

  if (isOverlay) {
    return (
      <div
        className="rounded-xl p-3"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--accent-indigo)",
          borderLeft: `3px solid ${pConfig.color}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        <p className="text-sm font-medium">{task.title}</p>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={{ ...style, touchAction: "none" }} className="group animate-fade-in">
      <div
        className="rounded-xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: `3px solid ${pConfig.color}`,
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("[data-action]")) {
            onOpenModal?.(task);
          }
        }}
      >
        {/* Drag handle + title row */}
        <div className="flex items-start gap-1 px-3 pt-3 pb-1">
          {/* Drag handle — always visible on mobile, subtle on desktop */}
          <div
            {...attributes}
            {...listeners}
            data-action
            className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
            style={{ cursor: "grab", color: "var(--text-muted)", touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
            title="Drag to reorder"
          >
            <GripIcon size={14} />
          </div>

          <h3 className="flex-1 text-sm font-semibold leading-snug">{task.title}</h3>

          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" data-action>
            <button
              data-action
              onClick={(e) => { e.stopPropagation(); onOpenModal?.(task); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
              title="Edit task"
            >
              <PencilIcon size={11} />
            </button>
            <button
              data-action
              onClick={(e) => handleDelete(e)}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
              style={{
                background: confirmDelete ? "rgba(239,68,68,0.2)" : "var(--bg-elevated)",
                color: confirmDelete ? "#ef4444" : "var(--text-secondary)",
                border: confirmDelete ? "1px solid rgba(239,68,68,0.4)" : "none",
              }}
              title={confirmDelete ? "Click again to confirm delete" : "Delete task"}
            >
              {confirmDelete ? <CheckIcon size={11} /> : <TrashIcon size={11} />}
            </button>
          </div>
        </div>

        {task.description && (
          <p
            className="px-3 pb-1 text-xs leading-relaxed line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {task.description}
          </p>
        )}

        {/* Badges row */}
        <div className="flex items-center gap-2 px-3 pb-3 mt-1 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: pConfig.bg, color: pConfig.color }}
          >
            {pConfig.label}
          </span>

          {due && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: due.overdue ? "rgba(239,68,68,0.15)" : due.warn ? "rgba(245,158,11,0.15)" : "rgba(100,116,139,0.15)",
                color:      due.overdue ? "#ef4444"              : due.warn ? "#f59e0b"              : "var(--text-secondary)",
              }}
            >
              {due.overdue
                ? <AlertIcon size={11} />
                : <CalendarIcon size={11} />
              }
              {due.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

