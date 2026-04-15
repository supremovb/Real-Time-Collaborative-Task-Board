"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { ChatMessage } from "@/types";
import { XIcon, SendIcon } from "./Icons";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getAvatarColor(name: string) {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#06b6d4"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + (h << 5) - h;
  return colors[Math.abs(h) % colors.length];
}

export default function Chat({
  socket,
  boardId,
  userName,
  members,
  onClose,
}: {
  socket: Socket;
  boardId: string;
  userName: string;
  members: string[];
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onHistory(msgs: ChatMessage[]) { setMessages(msgs); }
    function onMessage(msg: ChatMessage) { setMessages((prev) => [...prev, msg]); }

    socket.on("chat:history", onHistory);
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:history", onHistory);
      socket.off("chat:message", onMessage);
    };
  }, [socket]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    socket.emit("chat:send", { boardId, text });
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div
      className="flex flex-col"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 320,
        height: 480,
        zIndex: 40,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))",
          borderRadius: "var(--radius) var(--radius) 0 0",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }}
          />
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Board Chat
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(99,102,241,0.2)", color: "var(--accent-indigo)" }}
          >
            {members.length} online
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
          style={{ background: "var(--bg-primary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          <XIcon size={12} />
        </button>
      </div>

      {/* Online members */}
      {members.length > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 shrink-0 flex-wrap"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          {members.slice(0, 6).map((m) => (
            <span
              key={m}
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: getAvatarColor(m) + "22", color: getAvatarColor(m) }}
            >
              {m === userName ? `${m} (you)` : m}
            </span>
          ))}
          {members.length > 6 && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              +{members.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
              No messages yet.<br />Say hello to your team!
            </p>
          </div>
        )}
        {messages.map((msg) =>
          msg.type === "system" ? (
            <div key={msg.id} className="text-center">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
              >
                {msg.text}
              </span>
            </div>
          ) : (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.senderName === userName ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: getAvatarColor(msg.senderName || "?"), color: "#fff" }}
              >
                {(msg.senderName || "?")[0].toUpperCase()}
              </div>
              <div className={`flex flex-col gap-0.5 max-w-[72%] ${msg.senderName === userName ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: getAvatarColor(msg.senderName || "?") }}>
                    {msg.senderName === userName ? "You" : msg.senderName}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  className="px-3 py-1.5 rounded-2xl text-xs leading-relaxed"
                  style={{
                    background: msg.senderName === userName
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "var(--bg-elevated)",
                    color: msg.senderName === userName ? "#fff" : "var(--text-primary)",
                    borderRadius: msg.senderName === userName ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <input
          ref={inputRef}
          className="flex-1 px-3 py-1.5 rounded-xl text-xs outline-none"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          maxLength={500}
          autoComplete="off"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}
        >
          <SendIcon size={14} />
        </button>
      </div>
    </div>
  );
}
