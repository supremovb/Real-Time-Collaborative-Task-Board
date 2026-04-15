"use client";

import { useState } from "react";
import { LockIcon, XIcon, CheckIcon, EyeIcon, EyeOffIcon, ShieldIcon } from "./Icons";

interface Props {
  boardId: string;
  mode: "setup" | "verify";
  onSuccess: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
  onSubmit: (password: string) => Promise<void>;
}

export default function BoardPasswordModal({
  boardId,
  mode,
  onSuccess: _onSuccess,
  onCancel,
  loading: externalLoading,
  error: externalError,
  onSubmit,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoading = externalLoading || loading;
  const error = externalError || localError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");

    if (!password) {
      setLocalError("Please enter a password");
      return;
    }
    if (mode === "setup") {
      if (password.length < 4) {
        setLocalError("Password must be at least 4 characters");
        return;
      }
      if (password !== confirm) {
        setLocalError("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      await onSubmit(password);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: mode === "setup"
                  ? "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))"
                  : "rgba(99,102,241,0.15)",
                color: "var(--accent-indigo)",
              }}
            >
              {mode === "setup" ? <ShieldIcon size={20} /> : <LockIcon size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {mode === "setup" ? "Protect This Board" : "Board Protected"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {boardId}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: "var(--text-muted)", background: "var(--bg-primary)" }}
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          {mode === "setup"
            ? "Set a password so only people with the password can access this board."
            : "This board is password-protected. Enter the password to continue."}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Password field */}
          <div className="mb-3">
            <label className="field-label">
              {mode === "setup" ? "New Password" : "Password"}
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "setup" ? "At least 4 characters" : "Enter board password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete={mode === "setup" ? "new-password" : "current-password"}
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute flex items-center justify-center cursor-pointer"
                style={{
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password field (setup only) */}
          {mode === "setup" && (
            <div className="mb-4">
              <label className="field-label">Confirm Password</label>
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p
              className="text-xs mb-3 px-3 py-2 rounded-lg"
              style={{
                color: "var(--accent-red)",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              {mode === "setup" ? "Skip for now" : "Cancel"}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                <CheckIcon size={14} />
              )}
              {isLoading
                ? "Please wait…"
                : mode === "setup"
                ? "Set Password"
                : "Enter Board"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
