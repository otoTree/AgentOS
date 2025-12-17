import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/infra/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

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
      <body className={cn(inter.variable, playfair.variable, "antialiased font-sans")}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
