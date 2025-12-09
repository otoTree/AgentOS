import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentOS - The Intelligent Operating System for AI Agents",
  description: "AgentOS is the ultimate infrastructure for AI agents, integrating file systems, workspaces, automated coding, global file management, tool execution, and email processing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
