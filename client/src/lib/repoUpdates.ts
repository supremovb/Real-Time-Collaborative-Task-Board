export interface RepoUpdateEntry {
  id: string;
  version: string;
  timestamp: string;
  summary: string;
  details: string[];
  url?: string;
}

export function formatRepoTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export const FALLBACK_REPO_UPDATES: RepoUpdateEntry[] = [
  {
    id: "5a1d1f3",
    version: "Release 5a1d1f3",
    timestamp: "Apr 16, 2026 02:03 AM",
    summary: "Activity panels, logout flow, and landing updates",
    details: [
      "Added dedicated members and activity side panels.",
      "Improved join and leave tracking across the board.",
      "Added logout and return-to-home behavior for signed-in users.",
      "Added a landing-page release notes preview.",
    ],
  },
  {
    id: "02b60eb",
    version: "Release 02b60eb",
    timestamp: "Apr 16, 2026 12:50 AM",
    summary: "Next.js runtime stability update",
    details: [
      "Upgraded the client to Next.js 16.2.3.",
      "Resolved the webpack SegmentViewNode runtime issue.",
    ],
  },
  {
    id: "518a025",
    version: "Release 518a025",
    timestamp: "Apr 16, 2026 12:46 AM",
    summary: "Unread badge and owner sharing improvements",
    details: [
      "Stopped system join messages from affecting unread counts.",
      "Added protected and open invite link sharing for board owners.",
    ],
  },
  {
    id: "c2b9297",
    version: "Release c2b9297",
    timestamp: "Apr 16, 2026 12:33 AM",
    summary: "Refresh spam and password bypass fixes",
    details: [
      "Stopped join and leave spam from being persisted in chat history.",
      "Allowed the board owner to bypass password prompts correctly.",
    ],
  },
];
