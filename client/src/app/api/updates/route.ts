import { NextResponse } from "next/server";
import { FALLBACK_REPO_UPDATES, formatRepoTimestamp, RepoUpdateEntry } from "@/lib/repoUpdates";

const REPO_OWNER = "supremovb";
const REPO_NAME = "Real-Time-Collaborative-Task-Board";
const COMMITS_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=25`;

export async function GET() {
  try {
    const response = await fetch(COMMITS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "TaskBoard-Updater",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const commits = await response.json();
    const updates: RepoUpdateEntry[] = Array.isArray(commits)
      ? commits.map((commit: any) => {
          const sha = String(commit.sha || "").slice(0, 7) || "unknown";
          const fullMessage = String(commit?.commit?.message || "Repository update");
          const parts = fullMessage.split("\n").map((line) => line.trim()).filter(Boolean);
          const timestampRaw = commit?.commit?.author?.date || commit?.commit?.committer?.date || new Date().toISOString();

          return {
            id: sha,
            version: `Release ${sha}`,
            timestamp: formatRepoTimestamp(timestampRaw),
            summary: parts[0] || "Repository update",
            details: parts.slice(1).length > 0 ? parts.slice(1) : ["Update pushed to the repository."],
            url: commit?.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/commit/${sha}`,
          };
        })
      : FALLBACK_REPO_UPDATES;

    return NextResponse.json({ updates });
  } catch {
    return NextResponse.json({ updates: FALLBACK_REPO_UPDATES, fallback: true });
  }
}
