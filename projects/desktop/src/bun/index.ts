import { BrowserWindow, BrowserView } from "electrobun/bun";
import { AgentService } from "./agent/service";
import { DesktopLLMClient } from "./agent/llm";
import { ApiClient } from "./api";
import { SyncService } from "./service/sync";
import { SandboxService } from "./service/sandbox";
import { LocalCoderService } from "./service/coder";
import { SkillRegistry } from "./service/skill";
import { SkillFileSystemService } from "./service/skill_fs";
import { createSkillTools } from "./tools/skill";
import { PythonManager } from "./service/PythonManager";
import { AgentRPCSchema } from "../types/rpc";
import { localDB } from "./db";

// 1. Init Services
// Note: In a real app, token should be managed/persisted.
// For now, we assume ApiClient handles its own state or we set it later.
const apiClient = new ApiClient(); 
const llmClient = new DesktopLLMClient(apiClient);
const syncService = new SyncService(apiClient);
const sandboxService = new SandboxService();
const skillRegistry = new SkillRegistry();
const skillFsService = new SkillFileSystemService();
const skillTools = createSkillTools(skillRegistry, sandboxService);
const agentService = new AgentService(llmClient, skillTools);
const localCoderService = new LocalCoderService(llmClient);

syncService.start();

let mainWindow: BrowserWindow<any>;

const rpc = BrowserView.defineRPC<AgentRPCSchema>({
  maxRequestTime: 120000,
  handlers: {
    requests: {
      chat: (async ({ message, sessionId }: { message: string, sessionId: string }) => {
        console.log("[Bun] RPC chat request received", { length: message?.length, sessionId });
        const sid = sessionId || "default-session";
        try {
            const result = await agentService.chat(message, sid, 0, (type, data) => {
                // Send RPC message to webview
                if (mainWindow && mainWindow.webview) {
                    if (type === 'tool_start') {
                        (mainWindow.webview.rpc as any).send.tool_start(data);
                    } else if (type === 'tool_end') {
                        (mainWindow.webview.rpc as any).send.tool_end(data);
                    }
                }
            });
            console.log("[Bun] RPC chat response", { length: result.content?.length, toolCalls: result.toolCalls?.length });
            return result;
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
      }) as any,
      runScript: (async ({ code, language }: { code: string, language: string }) => {
        console.log("[Bun] RPC runScript", { language });
        return await sandboxService.runScript(code, language);
      }) as any,
      listSkills: (async () => {
        console.log("[Bun] RPC listSkills");
        const skills = await skillRegistry.listSkills();
        return { skills };
      }) as any,
      generateSkill: (async ({ prompt }: { prompt: string }) => {
        console.log("[Bun] RPC generateSkill", { prompt });
        return await localCoderService.generateSkill(prompt, (event) => {
            if (mainWindow && mainWindow.webview) {
                 // Map event to tool_start/end
                 // event structure: { type, name, content, sessionId }
                 if (event.type === 'step_start') {
                     (mainWindow.webview.rpc as any).send.tool_start({
                         sessionId: event.sessionId,
                         name: event.name,
                         args: event.content
                     });
                 } else if (event.type === 'step_end') {
                     (mainWindow.webview.rpc as any).send.tool_end({
                         sessionId: event.sessionId,
                         name: event.name,
                         output: event.content
                     });
                 }
            }
        });
      }) as any,
      publishSkill: (async ({ skillName }: { skillName: string }) => {
        console.log("[Bun] RPC publishSkill", { skillName });
        return await skillRegistry.publishSkill(skillName);
      }) as any,
      deleteSkill: (async ({ skillName }: { skillName: string }) => {
        console.log("[Bun] RPC deleteSkill", { skillName });
        try {
            await skillRegistry.deleteSkill(skillName);
            return { success: true };
        } catch (e: any) {
            console.error("[Bun] RPC deleteSkill error:", e);
            return { success: false, error: e.message };
        }
      }) as any,
      skillFsList: (async ({ skillName, path }: { skillName: string, path?: string }) => {
        console.log("[Bun] RPC skillFsList", { skillName, path });
        try {
            const files = await skillFsService.listFiles(skillName, path || '');
            return { files };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsList error:", e);
            return { files: [], error: e.message };
        }
      }) as any,
      skillFsRead: (async ({ skillName, path }: { skillName: string, path: string }) => {
        console.log("[Bun] RPC skillFsRead", { skillName, path });
        try {
            const content = await skillFsService.readFile(skillName, path);
            return { content };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsRead error:", e);
            return { content: '', error: e.message };
        }
      }) as any,
      skillFsWrite: (async ({ skillName, path, content }: { skillName: string, path: string, content: string }) => {
        console.log("[Bun] RPC skillFsWrite", { skillName, path });
        try {
            await skillFsService.writeFile(skillName, path, content);
            return { success: true };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsWrite error:", e);
            return { success: false, error: e.message };
        }
      }) as any,
      skillFsCreateDirectory: (async ({ skillName, path }: { skillName: string, path: string }) => {
        console.log("[Bun] RPC skillFsCreateDirectory", { skillName, path });
        try {
            await skillFsService.createDirectory(skillName, path);
            return { success: true };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsCreateDirectory error:", e);
            return { success: false, error: e.message };
        }
      }) as any,
      skillFsRename: (async ({ skillName, oldPath, newPath }: { skillName: string, oldPath: string, newPath: string }) => {
        console.log("[Bun] RPC skillFsRename", { skillName, oldPath, newPath });
        try {
            await skillFsService.renameFile(skillName, oldPath, newPath);
            return { success: true };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsRename error:", e);
            return { success: false, error: e.message };
        }
      }) as any,
      skillFsDelete: (async ({ skillName, path }: { skillName: string, path: string }) => {
        console.log("[Bun] RPC skillFsDelete", { skillName, path });
        try {
            await skillFsService.deleteFile(skillName, path);
            return { success: true };
        } catch (e: any) {
            console.error("[Bun] RPC skillFsDelete error:", e);
            return { success: false, error: e.message };
        }
      }) as any,
      listPythonPackages: (async () => {
        console.log("[Bun] RPC listPythonPackages");
        try {
          const packages = await PythonManager.getInstance().listPackages();
          return { packages };
        } catch (e: any) {
          console.error("[Bun] RPC listPythonPackages error:", e);
          return { packages: [] };
        }
      }) as any,
      installPythonPackage: (async ({ pkg }: { pkg: string }) => {
        console.log("[Bun] RPC installPythonPackage", { pkg });
        try {
          await PythonManager.getInstance().installPackage(pkg);
          return { success: true };
        } catch (e: any) {
          console.error("[Bun] RPC installPythonPackage error:", e);
          return { success: false, error: e.message };
        }
      }) as any,
      uninstallPythonPackage: (async ({ pkg }: { pkg: string }) => {
        console.log("[Bun] RPC uninstallPythonPackage", { pkg });
        try {
          await PythonManager.getInstance().uninstallPackage(pkg);
          return { success: true };
        } catch (e: any) {
          console.error("[Bun] RPC uninstallPythonPackage error:", e);
          return { success: false, error: e.message };
        }
      }) as any
    },
    messages: {}
  }
});

// Main Window Configuration
mainWindow = new BrowserWindow({
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
