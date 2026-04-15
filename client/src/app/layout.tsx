import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: {
    default: "TaskBoard",
    template: "%s | TaskBoard",
  },
  description:
    "Real-time collaborative kanban board — drag-and-drop tasks, board password protection, live presence, and instant sync across all devices.",
  applicationName: "TaskBoard",
  keywords: ["kanban", "task board", "real-time collaboration", "project management", "drag and drop"],
  authors: [{ name: "Primo Velasquez" }],
  creator: "Primo Velasquez",
  openGraph: {
    type: "website",
    siteName: "TaskBoard",
    title: "TaskBoard — Real-Time Collaborative Kanban",
    description:
      "Collaborate in real-time with drag-and-drop kanban boards, password protection, and instant sync.",
  },
  twitter: {
    card: "summary",
    title: "TaskBoard — Real-Time Collaborative Kanban",
    description: "Drag-and-drop kanban with real-time collaboration and board password protection.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
