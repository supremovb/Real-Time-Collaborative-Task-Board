"use client";

import { useState } from "react";
import { authLogin, authRegister } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { XIcon, EyeIcon, EyeOffIcon } from "./Icons";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    if (!u) { setError("Username is required"); return; }
    if (!password) { setError("Password is required"); return; }

    setLoading(true);
    try {
      const result = mode === "register"
        ? await authRegister(u, password)
        : await authLogin(u, password);
      login(result.user, result.token);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl p-6 animate-fade-in"
        style={{
          maxWidth: 420,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {mode === "login" ? "Sign In" : "Create Account"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {mode === "login"
                ? "Sign in to access your boards"
                : "Choose a unique username to get started"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <XIcon size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="field-label">Username</label>
            <input
              className="field-input"
              placeholder="e.g. primo_dev"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              maxLength={30}
              autoFocus
              autoComplete={mode === "login" ? "username" : "username"}
              disabled={loading}
            />
            {mode === "register" && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Letters, numbers, _ and - only. 2–30 characters.
              </p>
            )}
          </div>

          <div>
            <label className="field-label">Password</label>
            <div className="relative">
              <input
                className="field-input pr-10"
                type={showPw ? "text" : "password"}
                placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                maxLength={128}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: "var(--text-muted)" }}
                tabIndex={-1}
              >
                {showPw ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-transform active:scale-95 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            }}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="font-semibold cursor-pointer"
                style={{ color: "var(--accent-indigo)" }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="font-semibold cursor-pointer"
                style={{ color: "var(--accent-indigo)" }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
