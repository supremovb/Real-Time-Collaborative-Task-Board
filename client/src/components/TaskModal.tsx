"use client";

import { useEffect, useRef, useState } from "react";
import { Task, PRIORITY_CONFIG, COLUMNS, ColumnId } from "@/types";
import { updateTask } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { TodoIcon, InProgressIcon, DoneIcon, XIcon, AlertIcon, ClockIcon } from "./Icons";

function ColumnIcon({ id, size = 16 }: { id: ColumnId; size?: number }) {
  if (id === "todo")        return <TodoIcon       size={size} />;
  if (id === "in-progress") return <InProgressIcon size={size} />;
  return                          <DoneIcon        size={size} />;
}

function toInputDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function isOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export default function TaskModal({
  task,
  onClose,
  onSaved,
}: {
  task: Task;
  onClose: () => void;
  onSaved: (updated: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(toInputDate(task.dueDate));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  const column = COLUMNS.find((c) => c.id === task.column);
  const pConfig = PRIORITY_CONFIG[priority];
  const overdue = isOverdue(task.dueDate);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTask(task._id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
      });
      toast("Task updated successfully", "success");
      onSaved(updated);
      onClose();
    } catch {
      toast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl animate-scale-in"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            {column && (
              <span style={{ color: column.color }}>
                <ColumnIcon id={column.id} size={18} />
              </span>
            )}
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{ background: column?.color + "22", color: column?.color }}
            >
              {column?.title}
            </span>
            {overdue && (
              <span
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                <AlertIcon size={11} />
                Overdue
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="field-label">Title</label>
            <input
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          <div>
            <label className="field-label">Description</label>
            <textarea
              className="field-input resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Add more details about this task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Priority</label>
              <select
                className="field-input cursor-pointer"
                style={{ color: pConfig.color, borderColor: pConfig.color + "55" }}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="field-label">Due Date</label>
              <input
                type="date"
                className="field-input cursor-pointer"
                style={{ colorScheme: "dark" }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-6 text-xs pt-1 items-center" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1">
              <ClockIcon size={11} />
              Created {new Date(task.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={11} />
              Updated {new Date(task.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end gap-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
