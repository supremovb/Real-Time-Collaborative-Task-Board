"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { submitFeedback } from "@/lib/api";
import { ArrowLeftIcon, MessageIcon } from "@/components/Icons";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [type, setType] = useState<"suggestion" | "bug">("suggestion");
  const [name, setName] = useState(user?.username || "");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await submitFeedback({
        type,
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        message: message.trim(),
        isAuthenticated: !!user,
      });
      setTitle("");
      setMessage("");
      setEmail("");
      if (!user) setName("");
      setStatus("Thanks — your message was submitted successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Suggestions and Bug Reports
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Logged-in users and anonymous visitors can both send feedback here.
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <ArrowLeftIcon size={14} />
            Home
          </Link>
        </div>

        <div className="rounded-2xl p-5" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          <div className="flex items-center gap-2 mb-4" style={{ color: "var(--accent-indigo)" }}>
            <MessageIcon size={18} />
            <span className="font-semibold">Feedback Form</span>
          </div>

          {user && (
            <div className="mb-4 text-sm px-3 py-2 rounded-xl" style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent-indigo)" }}>
              Signed in as @{user.username}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "suggestion" | "bug")}
                className="px-3 py-2 rounded-xl outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                <option value="suggestion">Suggestion</option>
                <option value="bug">Bug Report</option>
              </select>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or Anonymous"
                className="px-3 py-2 rounded-xl outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional email"
              className="px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title"
              maxLength={120}
              required
              className="px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the suggestion or bug here..."
              maxLength={2000}
              required
              rows={7}
              className="px-3 py-2 rounded-xl outline-none resize-y"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl font-semibold"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", opacity: saving ? 0.8 : 1 }}
            >
              {saving ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>

          {status && (
            <p className="mt-3 text-sm" style={{ color: status.startsWith("Thanks") ? "#10b981" : "#ef4444" }}>
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
