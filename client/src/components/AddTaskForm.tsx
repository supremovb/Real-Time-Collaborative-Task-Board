"use client";

import { useState } from "react";
import { createTask } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { PRIORITY_CONFIG } from "@/types";

export default function AddTaskForm({ boardId }: { boardId: string }) {
  const [title, setTitle]       = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading]   = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || loading) return;
    setLoading(true);
    try {
      await createTask({ title: title.trim(), boardId, priority, column: "todo" });
      toast(`"${title.trim()}" added to To Do`, "success");
      setTitle("");
    } catch {
      toast("Failed to add task", "error");
    } finally {
      setLoading(false);
    }
  }

  const pConfig = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full">
      <input
        className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none min-w-0"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
        placeholder="Add a task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
      />
      {/* Priority picker */}
      <select
        className="px-2 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer shrink-0"
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${pConfig.color}55`,
          color: pConfig.color,
        }}
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        title="Priority"
      >
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button
        type="submit"
        disabled={!title.trim() || loading}
        className="btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "…" : "Add"}
      </button>
    </form>
  );
}
