"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";

import TaskCard from "./TaskCard";
import { TodoIcon, InProgressIcon, DoneIcon, PlusIcon, MinusIcon, ChevronUpIcon, ChevronDownIcon } from "./Icons";
import { Task, ColumnDef, ColumnId } from "@/types";
import { createTask } from "@/lib/api";
import { useToast } from "@/context/ToastContext";

function ColumnIcon({ id, size = 16 }: { id: ColumnId; size?: number }) {
  if (id === "todo")        return <TodoIcon        size={size} />;
  if (id === "in-progress") return <InProgressIcon  size={size} />;
  return                           <DoneIcon         size={size} />;
}

export default function Column({
  column,
  tasks,
  boardId,
  onOpenModal,
}: {
  column: ColumnDef;
  tasks: Task[];
  boardId: string;
  onOpenModal: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [quickTitle, setQuickTitle] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();

  async function handleQuickAdd() {
    if (!quickTitle.trim() || adding) return;
    setAdding(true);
    try {
      await createTask({ title: quickTitle.trim(), column: column.id, boardId });
      toast(`Task added to ${column.title}`, "success");
      setQuickTitle("");
      setQuickOpen(false);
    } catch {
      toast("Failed to add task", "error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ height: "100%",
        background: "var(--bg-secondary)",
        border: isOver ? `2px solid ${column.color}` : "2px solid var(--border)",
        boxShadow: isOver ? `0 0 24px ${column.color}33` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Column header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: column.color + "12", borderBottom: `2px solid ${column.color}` }}
      >
        <div className="flex items-center gap-2" style={{ color: column.color }}>
          <ColumnIcon id={column.id} size={15} />
          <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{column.title}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: column.color + "25", color: column.color }}
          >
            {tasks.length}
          </span>
          <button
            onClick={() => { setQuickOpen((v) => !v); setCollapsed(false); }}
            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: column.color, background: column.color + "18" }}
            title={`Add task to ${column.title}`}
          >
            {quickOpen ? <MinusIcon size={12} /> : <PlusIcon size={12} />}
          </button>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
            title={collapsed ? "Expand column" : "Collapse column"}
          >
            {collapsed ? <ChevronDownIcon size={12} /> : <ChevronUpIcon size={12} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Quick-add inline form */}
          {quickOpen && (
            <div
              className="px-3 py-2 flex gap-2 items-center border-b animate-fade-in"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <input
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                style={{
                  background: "var(--bg-primary)",
                  border: `1px solid ${column.color}44`,
                  color: "var(--text-primary)",
                }}
                placeholder={`Add to ${column.title}…`}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickAdd();
                  if (e.key === "Escape") setQuickOpen(false);
                }}
                maxLength={200}
                autoFocus
              />
              <button
                onClick={handleQuickAdd}
                disabled={!quickTitle.trim() || adding}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: column.color, color: "#fff" }}
              >
                {adding ? "…" : "Add"}
              </button>
            </div>
          )}

          {/* Task list */}
          <div
            ref={setNodeRef}
            className="flex-1 p-2.5 flex flex-col gap-2 overflow-y-auto"
            style={{ minHeight: 120, maxHeight: "calc(100vh - 230px)" }}
          >
            <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
              {tasks.length === 0 ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center py-10 rounded-xl"
                  style={{ border: `2px dashed ${column.color}30`, color: "var(--text-muted)" }}
                >
                  <div className="mb-2 opacity-30" style={{ color: column.color }}>
                    <ColumnIcon id={column.id} size={28} />
                  </div>
                  <p className="text-xs font-medium">No tasks here</p>
                  <p className="text-xs opacity-70 mt-0.5">Drag one here or press +</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    onOpenModal={onOpenModal}
                  />
                ))
              )}
            </SortableContext>
          </div>
        </>
      )}

      {/* Collapsed placeholder */}
      {collapsed && (
        <div
          className="px-4 py-3 text-xs text-center cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          onClick={() => setCollapsed(false)}
        >
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} — click to expand
        </div>
      )}
    </div>
  );
}


