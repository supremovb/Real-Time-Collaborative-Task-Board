"use client";

import { UsersIcon, XIcon, LockIcon } from "./Icons";

export default function MembersPanel({
  members,
  userName,
  ownerName,
  onClose,
}: {
  members: string[];
  userName: string;
  ownerName: string | null;
  onClose: () => void;
}) {
  const uniqueMembers = Array.from(new Set(members.filter(Boolean)));

  const sorted = [...uniqueMembers].sort((a, b) => {
    if (a === ownerName) return -1;
    if (b === ownerName) return 1;
    if (a === userName) return -1;
    if (b === userName) return 1;
    return a.localeCompare(b);
  });

  return (
    <div
      className="fixed right-0 top-0 h-full w-72 flex flex-col z-40 shadow-2xl"
      style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <UsersIcon size={15} style={{ color: "var(--accent-indigo)" }} />
          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            Members
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
          >
            {uniqueMembers.length} online
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <XIcon size={13} />
        </button>
      </div>

      {/* Member list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        {sorted.map((member) => {
          const isYou  = member === userName;
          const isOwnerMember = member === ownerName;
          const initials = member.slice(0, 2).toUpperCase();
          const hue = [...member].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

          return (
            <div
              key={member}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ background: `hsl(${hue},60%,50%)` }}
              >
                {initials}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {member}
                  </span>
                  {isOwnerMember && (
                    <span
                      className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(99,102,241,0.12)", color: "var(--accent-indigo)" }}
                    >
                      <LockIcon size={9} />
                      Owner
                    </span>
                  )}
                  {isYou && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                    >
                      you
                    </span>
                  )}
                </div>
              </div>

              {/* Online dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: "#10b981", boxShadow: "0 0 5px #10b981" }}
              />
            </div>
          );
        })}

        {uniqueMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <UsersIcon size={32} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
            <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>No members online.</p>
          </div>
        )}
      </div>
    </div>
  );
}
