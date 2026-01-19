import { BrowserWindow, BrowserView } from "electrobun/bun";
import { AgentService } from "./agent/service";
import { DesktopLLMClient } from "./agent/llm";
import { ApiClient } from "./api";
import { SyncService } from "./service/sync";
import { AgentRPCSchema } from "../types/rpc";
import { localDB } from "./db";

// 1. Init Services
// Note: In a real app, token should be managed/persisted.
// For now, we assume ApiClient handles its own state or we set it later.
const apiClient = new ApiClient(); 
const llmClient = new DesktopLLMClient(apiClient);
const agentService = new AgentService(llmClient);
const syncService = new SyncService(apiClient);

syncService.start();

const rpc = BrowserView.defineRPC<AgentRPCSchema>({
  maxRequestTime: 120000,
  handlers: {
    requests: {
      chat: (async ({ message, sessionId }: { message: string, sessionId: string }) => {
        console.log("[Bun] RPC chat request received", { length: message?.length, sessionId });
        const sid = sessionId || "default-session";
        try {
            const content = await agentService.chat(message, sid, 0);
            console.log("[Bun] RPC chat response", { length: content?.length });
            return { content };
        } catch (e: any) {
            console.error("[Bun] RPC chat error:", e);
            throw new Error(e.message || String(e));
        }
      }) as any,
      getHistory: (async ({ sessionId }: { sessionId?: string }) => {
        const sid = sessionId || "default-session";
        console.log("[Bun] RPC getHistory", { sessionId: sid });
        const messages = localDB.getMessages(sid);
        console.log("[Bun] RPC getHistory result", { count: messages.length });
        return { messages };
      }) as any,
      setToken: (async ({ token }: { token: string }) => {
        console.log("[Bun] RPC setToken received", { length: token?.length });
        apiClient.setToken(token);
        return { success: true };
      }) as any
    },
    messages: {}
  }
});

// Main Window Configuration
const mainWindow = new BrowserWindow({
  title: "AgentOS",
  url: "views://mainview/index.html",
  frame: {
    width: 1024,
    height: 768,
    x: 100,
    y: 100,
    // Note: Electrobun might not support 'style: hidden' directly in frame config yet 
    // depending on version, but we will try to set standard properties.
    // If we want a custom titlebar, we usually need a way to hide the native one.
    // For now, we'll keep standard frame to ensure it works, 
    // or if the user provided spec implies it works, we assume the UI handles the look.
  },
  rpc
});

// IPC Handlers (Placeholder for now)
// In a real implementation, we would register these with Electrobun's RPC system.

console.log("AgentOS Desktop Main Process Started");

// Example of how we might handle events if Electrobun exposes them directly on window
// mainWindow.webview.on('dom-ready', () => { ... });
