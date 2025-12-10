'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { withTransaction } from "@/lib/infra/db-transaction";
import { getUserConfig, systemConfig } from "@/lib/infra/config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import OpenAI from 'openai';
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";
import { FileStorage } from "@/lib/storage/file-storage";
import { extractText } from "@/lib/storage/text-extractor";
import { CacheService } from "@/lib/infra/cache";
import {
  getFiles,
  getFolders,
  createFile,
  updateFileContent,
  deleteFile,
  createFolder,
  deleteFolder,
  renameFile,
  renameFolder,
  moveFile,
  moveFolder,
  getBreadcrumbs,
  getDownloadUrl
} from "@/app/file-actions";

export { getFiles,
  getFolders,
  createFile,
  updateFileContent,
  deleteFile,
  createFolder,
  deleteFolder,
  renameFile,
  renameFolder,
  moveFile,
  moveFolder,
  getBreadcrumbs,
  getDownloadUrl
};

import { toolSearch } from "@/lib/ai/tool-search";
// --- Conversation Management ---

export async function getConversations() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  return CacheService.get(`agent:conversations:${userId}`, async () => {
    return prisma.agentConversation.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        tools: {
          include: {
            tool: true
          }
        }
      }
    });
  }, 300);
}

export async function createConversation(title: string = "New Conversation") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  const conversation = await prisma.agentConversation.create({
    data: {
      title,
      userId: userId,
    }
  });

  await CacheService.del(`agent:conversations:${userId}`);
  revalidatePath("/agent");
  return conversation;
}

export async function deleteConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  await withTransaction(async (tx) => {
    await tx.agentConversation.delete({
      where: { id, userId: userId }
    });
  });

  await CacheService.del(`agent:conversations:${userId}`);
  await CacheService.del(`agent:conversation:${id}`);
  revalidatePath("/agent");
}

export async function getConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  return CacheService.get(`agent:conversation:${id}`, async () => {
    return prisma.agentConversation.findFirst({
      where: { id, userId: userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        tools: {
          include: {
            tool: true
          }
        },
        files: {
          include: {
            file: true
          }
        }
      }
    });
  }, 60);
}

// --- Tool Management ---

export async function getPublicTools() {
    // Cache public tools for 5 minutes
    return await CacheService.get("marketplace:public_tools", async () => {
        // In a real scenario, we'd filter by "Public Deployments" and get the underlying tool
        // For now, we can query projects with public deployments
        const projects = await prisma.project.findMany({
            where: {
                deployments: {
                    some: {
                        isActive: true,
                        accessType: 'PUBLIC'
                    }
                }
            },
            include: {
                deployments: {
                    where: { isActive: true, accessType: 'PUBLIC' },
                    include: { tool: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        // Extract tools from active deployments
        const tools = projects.flatMap(p => p.deployments
            .filter(d => d.tool !== null)
            .map(d => ({
                ...d.tool!, // Force non-null assertion since we filtered
                projectName: p.name,
                projectAvatar: p.avatar,
                deploymentId: d.id
            }))
        );

        return tools;
    }, 300); // 300 seconds = 5 minutes
}

export async function getUserTools() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    return await CacheService.get(`user:tools:${userId}`, async () => {
        // Find projects owned by the user that have active deployments
        // We include both public and private tools since they belong to the user
        const projects = await prisma.project.findMany({
            where: {
                userId: userId,
            },
            include: {
                deployments: {
                    where: { isActive: true },
                    include: { tool: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        // Extract tools from active deployments
        const tools = projects.flatMap(p => p.deployments
            .filter(d => d.tool !== null)
            .map(d => ({
                ...d.tool!,
                projectName: p.name,
                projectAvatar: p.avatar,
                deploymentId: d.id
            }))
        );

        return tools;
    }, 60); // Cache for 1 minute
}

export async function addToolToConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await withTransaction(async (tx) => {
    // Verify ownership of conversation
    const conversation = await tx.agentConversation.findUnique({
      where: { id: conversationId, userId: userId }
    });
    if (!conversation) throw new Error("Conversation not found");

    // Check if tool is already added
    const existing = await tx.conversationTool.findUnique({
      where: {
        conversationId_toolId: {
          conversationId,
          toolId
        }
      }
    });

    if (!existing) {
      await tx.conversationTool.create({
        data: {
          conversationId,
          toolId
        }
      });
    }
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeToolFromConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await withTransaction(async (tx) => {
    await tx.conversationTool.delete({
      where: {
        conversationId_toolId: {
          conversationId,
          toolId
        }
      }
    });
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

// --- Messaging Logic ---

export async function sendMessage(conversationId: string, message: string, context?: { browserSessionId?: string }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    // 1. Save User Message
    await prisma.agentMessage.create({
        data: {
            conversationId,
            role: 'user',
            content: message
        }
    });

    // Start background processing
    processAgentResponse(conversationId, userId, message, context).catch(e => {
        console.error("Error in background agent processing:", e);
    });

    await CacheService.del(`agent:conversation:${conversationId}`);
    revalidatePath(`/agent/${conversationId}`);

    return { status: 'queued' };
}

async function processAgentResponse(conversationId: string, userId: string, message: string, context?: { browserSessionId?: string }) {
    // 2. Get Conversation Context
    const conversation = await prisma.agentConversation.findUnique({
        where: { id: conversationId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                // Take last 20 messages to fit context window
                take: -20 
            },
            tools: {
                include: {
                    tool: true
                }
            },
            files: {
                include: {
                    file: true
                }
            }
        }
    });

    if (!conversation) throw new Error("Conversation not found");

    // Auto-generate title if it's "New Conversation" and we have first user message
    if (conversation.title === "New Conversation") {
        const messageCount = await prisma.agentMessage.count({ where: { conversationId } });
        if (messageCount <= 1) {
             // Simple heuristic: take first 30 chars
             const newTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
             await prisma.agentConversation.update({
                 where: { id: conversationId },
                 data: { title: newTitle }
             });
        }
    }

    // 3. Prepare History
    const dbMessages = await prisma.agentMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' }
    });

    // 4. Prepare Tools
    // We inject tool descriptions into the system prompt as requested.
    // Format:
    // Tool Name: [name]
    // Description: [desc]
    // Inputs: [json inputs]
    
    let toolPromptSection = "\n\n# AVAILABLE TOOLS\n\n";

    // 1. Built-in Tools
    toolPromptSection += `## search_tools (ID: builtin_search)\n`;
    toolPromptSection += `Description: Search for available tools in the marketplace. Use this when the user asks for a capability you don't currently have.\n`;
    toolPromptSection += `Inputs: [{"name": "query", "type": "string", "description": "Search keywords"}]\n\n`;

    toolPromptSection += `## enable_tools (ID: builtin_enable)\n`;
    toolPromptSection += `Description: Enable one or more tools by their IDs. Use this after finding relevant tools via search_tools.\n`;
    toolPromptSection += `Inputs: [{"name": "toolIds", "type": "string[]", "description": "List of Tool IDs to enable"}]\n\n`;

    toolPromptSection += `## open_window (ID: builtin_open_window)\n`;
    toolPromptSection += `Description: Open a special function window in the user's interface. Available types: 'files' (File Browser), 'workbench' (Project Workbench), 'editor' (Code Editor).\n`;
    toolPromptSection += `Inputs: [{"name": "window_type", "type": "string", "description": "Type of window: 'files', 'workbench', 'editor'"}, {"name": "file_id", "type": "string", "description": "Optional: File ID if opening editor"}]\n\n`;


    // 1.5 File System Tools
    toolPromptSection += `## fs_list_files (ID: fs_list_files)\n`;
    toolPromptSection += `Description: List files and folders in a specific directory. Use folderId=null for root.\n`;
    toolPromptSection += `Inputs: [{"name": "folderId", "type": "string | null", "description": "Folder ID to list content for. Omit or null for root."}]\n\n`;

    toolPromptSection += `## fs_read_file (ID: fs_read_file)\n`;
    toolPromptSection += `Description: Read the content of a file by its ID.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "The ID of the file to read"}]\n\n`;

    toolPromptSection += `## fs_create_file (ID: fs_create_file)\n`;
    toolPromptSection += `Description: Create a new file in a specific folder.\n`;
    toolPromptSection += `Inputs: [{"name": "name", "type": "string", "description": "File name with extension"}, {"name": "folderId", "type": "string | null", "description": "Parent folder ID"}, {"name": "content", "type": "string", "description": "Initial file content"}]\n\n`;

    toolPromptSection += `## fs_update_file (ID: fs_update_file)\n`;
    toolPromptSection += `Description: Update the content of an existing file.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "File ID"}, {"name": "content", "type": "string", "description": "New file content (overwrites existing)"}]\n\n`;

    toolPromptSection += `## fs_delete_file (ID: fs_delete_file)\n`;
    toolPromptSection += `Description: Delete a file by its ID.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "File ID"}]\n\n`;


    toolPromptSection += `## browser_open (ID: browser_open)\n`;
    toolPromptSection += `Description: Open a URL in the browser. Returns the session ID.\n`;
    toolPromptSection += `Inputs: [{"name": "url", "type": "string", "description": "URL to open"}]\n\n`;

    toolPromptSection += `## browser_navigate (ID: browser_navigate)\n`;
    toolPromptSection += `Description: Navigate to a URL in an existing browser session.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "url", "type": "string", "description": "URL to navigate to"}]\n\n`;

    toolPromptSection += `## browser_click (ID: browser_click)\n`;
    toolPromptSection += `Description: Click on an element in the browser using a CSS selector.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "selector", "type": "string", "description": "CSS selector of the element to click"}]\n\n`;

    toolPromptSection += `## browser_type (ID: browser_type)\n`;
    toolPromptSection += `Description: Type text into the browser.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "text", "type": "string", "description": "Text to type"}]\n\n`;

    toolPromptSection += `## browser_scroll (ID: browser_scroll)\n`;
    toolPromptSection += `Description: Scroll the browser page.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "direction", "type": "string", "description": "up/down"}, {"name": "amount", "type": "number", "description": "pixels"}]\n\n`;

    toolPromptSection += `## browser_screenshot (ID: browser_screenshot)\n`;
    toolPromptSection += `Description: Get a screenshot of the current page.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}]\n\n`;

    toolPromptSection += `## browser_source (ID: browser_source)\n`;
    toolPromptSection += `Description: Get the HTML source of the current page (filtered JS/CSS).\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}]\n\n`;

    if (context?.browserSessionId) {
        toolPromptSection += `\n# ACTIVE BROWSER SESSION\n`;
        toolPromptSection += `There is an active browser session available from the user's "Manage Context" view.\n`;
        toolPromptSection += `Session ID: ${context.browserSessionId}\n`;
        toolPromptSection += `You can use this Session ID with browser tools (navigate, click, type, etc.) to control the user's browser view.\n\n`;
    }

    // 2. User Enabled Tools
    conversation.tools.forEach(t => {
        toolPromptSection += `## ${t.tool.name} (ID: ${t.tool.id})\n`;
        toolPromptSection += `Description: ${t.tool.description || 'No description'}\n`;
        toolPromptSection += `Inputs: ${JSON.stringify(t.tool.inputs)}\n\n`;
    });

    // 5. Prepare Files Context
    // We inject a list of available files
    let filePromptSection = "\n\n# ATTACHED FILES\n\n";
    if (conversation.files.length > 0) {
        filePromptSection += "You have access to the following files:\n";
        conversation.files.forEach(f => {
            filePromptSection += `- [File: ${f.file.name}] (ID: ${f.file.id}, Type: ${f.file.mimeType})\n`;
            // If text file, maybe include snippet? For now, keep it simple.
        });
        filePromptSection += "\nUse 'fs_read_file' to read their content if needed.\n";
    } else {
        filePromptSection += "No files attached currently.\n";
    }

    const systemPrompt = `You are a helpful AI agent capable of using tools and managing files.
    
${toolPromptSection}
${filePromptSection}

To call a tool, you MUST output a JSON object in the following format ONLY (no other text):
{
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": {
        "arg1": "value1"
      },
      "id": "tool_id"
    }
  ]
}

If you don't need to call a tool, just reply with your text response.
`;

    const messages = [
        { role: 'system', content: systemPrompt },
        ...dbMessages.map(m => {
            try {
                // Fix for legacy/inconsistent message formats to prevent model confusion
                if (m.content.trim().startsWith('{')) {
                    const obj = JSON.parse(m.content);
                    
                    // Convert legacy "type: tool_call" to standard "tool_calls" format
                    if (obj.type === 'tool_call') {
                        return {
                            role: 'assistant',
                            content: JSON.stringify({
                                tool_calls: [{
                                    name: obj.tool,
                                    arguments: obj.args,
                                    id: "call_" + Math.random().toString(36).substr(2, 9)
                                }]
                            })
                        };
                    }
                    
                    // Convert legacy "type: tool_result" to User message format
                    if (obj.type === 'tool_result') {
                        return {
                            role: 'user',
                            content: `Tool Execution Results:\nTool '${obj.tool}' Output:\n${obj.output}\n\n`
                        };
                    }
                }
            } catch (e) {
                // Ignore parse errors, treat as text
            }
            return { role: m.role, content: m.content };
        })
    ];

    let lastContent = "";
    // Keep track of latest browser state to return
    let finalBrowserState: { sessionId?: string, url?: string, screenshot?: string } | undefined;

    try {
        // Fetch user config
        const userConfig = await getUserConfig(userId);

        const apiKey = systemConfig.openai.apiKey;
        const baseURL = systemConfig.openai.baseUrl;
        const model = systemConfig.openai.model || "gpt-4o";

        if (!apiKey) {
            throw new Error("OpenAI API Key is not configured. Please contact administrator.");
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL || undefined
        });

        // Main Loop for ReAct / Tool Calling
        const maxTurns = 5; // Prevent infinite loops

        for (let i = 0; i < maxTurns; i++) {
            const response = await openai.chat.completions.create({
                model: model,
                messages: messages as any,
                temperature: 0.2, // Lower temperature for reliable tool calling
            });

            const aiContent = response.choices[0].message.content || "";
            lastContent = aiContent;
            const trimmed = aiContent.trim();

            // Check if response contains a tool call (JSON format)
            // We tolerate text before/after the JSON
            const firstBrace = aiContent.indexOf('{');
            const lastBrace = aiContent.lastIndexOf('}');
            
            let parsed: any = null;
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                try {
                    const jsonString = aiContent.substring(firstBrace, lastBrace + 1);
                    const obj = JSON.parse(jsonString);
                    if (obj.tool_calls && Array.isArray(obj.tool_calls)) {
                        parsed = obj;
                    }
                } catch (e) {
                    // JSON parse failed, treat as text
                }
            }

            if (parsed) {
                 try {
                    if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
                        const transactionOps: any[] = [];
                        // 1. Add Assistant Message (Tool Request) to History
                        // We save the FULL content including any thought process text
                        messages.push({ role: 'assistant', content: aiContent });

                        // 2. Execute Tools & Collect Outputs
                        let toolOutputs = "";
                        
                        // Limit number of tool calls to prevent loops/abuse
                        const callsToProcess = parsed.tool_calls.slice(0, 10);
                        
                        for (const call of callsToProcess) {
                            let resultOutput = "";
                            
                            // --- Built-in: Search Tools ---
                            if (call.id === 'builtin_search' || call.name === 'search_tools') {
                                const query = (call.arguments?.query || '').toLowerCase();
                                const terms = query.split(/\s+/).filter((t: string) => t.length > 0);
                                console.log("terms: ",terms)
                                resultOutput = await toolSearch(query)
                            //     const allTools = await getPublicTools();
                            //     const found = allTools.filter(t => {
                            //         const text = `${t.name} ${t.description || ''} ${t.projectName || ''}`.toLowerCase();
                            //         return terms.length === 0 || terms.some((term: string) => text.includes(term));
                            //     }).slice(0, 15);

                            //     resultOutput = `Found ${found.length} tools matching '${query}':\n` +
                            //          found.map(t => `- ${t.name} (ID: ${t.id}): ${t.description || 'No description'} (Project: ${t.projectName})`).join('\n') +
                            //          (found.length > 0 ? "\nYou can use 'enable_tools' to enable these." : "\nNo tools found.");
                            // 
                            }

                            // --- Built-in: Enable Tools ---
                            else if (call.id === 'builtin_enable' || call.name === 'enable_tools') {
                                const toolIds = call.arguments?.toolIds || [];
                                if (Array.isArray(toolIds)) {
                                    let addedCount = 0;
                                    for (const tid of toolIds) {
                                        // Verify tool exists (in public tools)
                                        // For simplicity, we just try to add it. `addToolToConversation` handles checks.
                                        try {
                                            await addToolToConversation(conversationId, tid);
                                            addedCount++;
                                        } catch (e) {
                                            console.error(`Failed to add tool ${tid}`, e);
                                        }
                                    }
                                    resultOutput = `Enabled ${addedCount} tools.`;
                                } else {
                                    resultOutput = "Invalid arguments. toolIds must be an array of strings.";
                                }
                            }

                            // --- Built-in: Open Window ---
                            else if (call.name === 'open_window') {
                                const { window_type, file_id } = call.arguments;
                                resultOutput = `Window '${window_type}' command sent to client.`;
                                if (file_id) {
                                    // Verify file exists just in case
                                    try {
                                        const file = await prisma.file.findUnique({ where: { id: file_id } });
                                        if (file) {
                                            resultOutput += ` File: ${file.name}`;
                                        }
                                    } catch (e) {}
                                }
                            }

                            // --- File System Tools ---
                            else if (call.name === 'fs_list_files') {
                                try {
                                    const folderId = call.arguments?.folderId || null;
                                    const files = await getFiles("", folderId); // Assuming user has access
                                    const folders = await getFolders(folderId);
                                    
                                    resultOutput = "Files:\n" + 
                                        files.map((f: any) => `- ${f.name} (ID: ${f.id})`).join('\n') +
                                        "\n\nFolders:\n" +
                                        folders.map((f: any) => `- ${f.name} (ID: ${f.id})`).join('\n');
                                } catch (e: any) {
                                    resultOutput = "Error listing files: " + e.message;
                                }
                            }
                            else if (call.name === 'fs_read_file') {
                                try {
                                    const fileId = call.arguments?.fileId;
                                    // We need to verify access. 
                                    // Ideally, we should check if file is attached to conversation OR if user owns it.
                                    // For now, let's assume user owns it if they can guess the ID (and our `getFiles` checks user ownership)
                                    // But `getFiles` is for listing. 
                                    // We should use `getFileContent` or similar.
                                    // Let's use a direct prisma check here for safety or reuse existing action if available.
                                    // We have `getFiles` but not `getFileContent` exported from dashboard/files/actions.
                                    // Let's fetch it directly from DB here for simplicity as we are server-side.
                                    
                                    const file = await prisma.file.findUnique({
                                        where: { id: fileId, userId: userId }
                                    });

                                    if (file) {
                                        resultOutput = file.content || "(Empty file)";
                                    } else {
                                        resultOutput = "File not found or unauthorized.";
                                    }
                                } catch (e: any) {
                                    resultOutput = "Error reading file: " + e.message;
                                }
                            }
                            else if (call.name === 'fs_create_file') {
                                try {
                                    const { name, folderId, content } = call.arguments;
                                    const newFile = await createFile(name, folderId);
                                    if (content) {
                                        await updateFileContent(newFile.id, content);
                                    }
                                    // Auto-attach to conversation? Maybe not automatically, but agent can see it in list now.
                                    resultOutput = `File created: ${newFile.name} (ID: ${newFile.id})`;
                                } catch (e: any) {
                                    resultOutput = "Error creating file: " + e.message;
                                }
                            }
                            else if (call.name === 'fs_update_file') {
                                try {
                                    const { fileId, content } = call.arguments;
                                    await updateFileContent(fileId, content);
                                    resultOutput = "File updated successfully.";
                                } catch (e: any) {
                                    resultOutput = "Error updating file: " + e.message;
                                }
                            }
                            else if (call.name === 'fs_delete_file') {
                                try {
                                    const { fileId } = call.arguments;
                                    await deleteFile(fileId);
                                    resultOutput = "File deleted successfully.";
                                } catch (e: any) {
                                    resultOutput = "Error deleting file: " + e.message;
                                }
                            }

                            // --- Browser Tools ---
                            else if (call.name.startsWith('browser_')) {
                                try {
                                    const SANDBOX_API_URL = systemConfig.sandbox.apiUrl;
                                    const SANDBOX_AUTH_TOKEN = systemConfig.sandbox.authToken;
                                    const headers = {
                                        'Content-Type': 'application/json',
                                        ...(SANDBOX_AUTH_TOKEN ? { 'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}` } : {})
                                    };
                                    
                                    let currentSessionId: string | undefined;
                                    let currentUrl: string | undefined;
                                    let currentScreenshot: string | undefined;

                                    if (call.name === 'browser_open') {
                                        const { url } = call.arguments;
                                        // Create session
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ device: 'desktop' })
                                        });
                                        if (!res.ok) throw new Error('Failed to create browser session');
                                        const data = await res.json();
                                        const sessionId = data.sessionId;
                                        currentSessionId = sessionId;

                                        // Navigate if URL provided
                                        if (url) {
                                            const navRes = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/navigate`, {
                                                method: 'POST',
                                                headers,
                                                body: JSON.stringify({ url })
                                            });
                                            if (navRes.ok) {
                                                const navData = await navRes.json();
                                                currentUrl = navData.url;
                                                currentScreenshot = navData.screenshot;
                                            }
                                        }
                                        resultOutput = `Browser opened. Session ID: ${sessionId}`;
                                    }
                                    else if (call.name === 'browser_navigate') {
                                        const { sessionId, url } = call.arguments;
                                        currentSessionId = sessionId;
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/navigate`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ url })
                                        });
                                        if (!res.ok) throw new Error('Failed to navigate');
                                        const data = await res.json();
                                        currentUrl = data.url;
                                        currentScreenshot = data.screenshot;
                                        resultOutput = `Navigated to ${url}`;
                                    }
                                    else if (call.name === 'browser_click') {
                                        const { sessionId, selector } = call.arguments;
                                        currentSessionId = sessionId;
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ action: 'click', selector })
                                        });
                                        if (!res.ok) throw new Error('Failed to click');
                                        const data = await res.json();
                                        if (data.screenshot) currentScreenshot = data.screenshot;
                                        // Try to get URL if changed
                                        // We can assume URL *might* change, but we don't always get it from action response?
                                        // The action response usually contains screenshot.
                                        // Let's rely on client-side sync or explicit evaluate if we really need it.
                                        // But wait, the user wants us to store latest state.
                                        // We should try to get the URL.
                                        // But making another call adds latency.
                                        // If data has url (some implementations do), use it.
                                        if (data.url) currentUrl = data.url;
                                        
                                        resultOutput = `Clicked on selector: ${selector}`;
                                    }
                                    else if (call.name === 'browser_type') {
                                        const { sessionId, text } = call.arguments;
                                        currentSessionId = sessionId;
                                        // We might need to send individual key presses or use a 'type' action if supported
                                        // Assuming 'type' action is supported or we iterate
                                        for (const char of text) {
                                             await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                                                method: 'POST',
                                                headers,
                                                body: JSON.stringify({ action: 'type', value: char })
                                            });
                                        }
                                        // Take a screenshot after typing
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ action: 'screenshot' }) // No-op action or explicit screenshot
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.screenshot) currentScreenshot = data.screenshot;
                                            if (data.url) currentUrl = data.url;
                                        }
                                        resultOutput = `Typed: ${text}`;
                                    }
                                    else if (call.name === 'browser_scroll') {
                                        const { sessionId, direction, amount } = call.arguments;
                                        currentSessionId = sessionId;
                                        const key = direction === 'up' ? 'PageUp' : 'PageDown';
                                        // Crude scroll using PageUp/Down for now as per browser.tsx implementation
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ action: 'press', value: key })
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.screenshot) currentScreenshot = data.screenshot;
                                            if (data.url) currentUrl = data.url;
                                        }
                                        resultOutput = `Scrolled ${direction}`;
                                    }
                                    else if (call.name === 'browser_screenshot') {
                                        const { sessionId } = call.arguments;
                                        currentSessionId = sessionId;
                                        // Usually navigate/action returns screenshot, but we can also request one?
                                        // The API docs don't show a direct "get screenshot" endpoint, but actions return it.
                                        // Let's assume we can trigger a no-op action or just report success.
                                        // Actually, let's skip returning the base64 here as it's too large for LLM context.
                                        
                                        // We trigger a screenshot action to capture state
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/action`, {
                                            method: 'POST',
                                            headers,
                                            body: JSON.stringify({ action: 'screenshot' })
                                        });
                                         if (res.ok) {
                                            const data = await res.json();
                                            if (data.screenshot) currentScreenshot = data.screenshot;
                                            if (data.url) currentUrl = data.url;
                                        }

                                        resultOutput = "Screenshot taken (not returned to text context to save space).";
                                    }
                                    else if (call.name === 'browser_source') {
                                        const { sessionId } = call.arguments;
                                        currentSessionId = sessionId;
                                        const res = await fetch(`${SANDBOX_API_URL}/browser/sessions/${sessionId}/content`, {
                                            headers: {
                                                ...(SANDBOX_AUTH_TOKEN ? { 'Authorization': `Bearer ${SANDBOX_AUTH_TOKEN}` } : {})
                                            }
                                        });
                                        if (!res.ok) throw new Error('Failed to get source');
                                        let html = await res.text();

                                        
                                        // Filter JS and CSS
                                        // Remove <script> tags
                                        html = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
                                        // Remove <style> tags
                                        html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "");
                                        // Remove inline style attributes? Maybe too aggressive.
                                        // Let's keep it simple.
                                        
                                        // Truncate if too long
                                        if (html.length > 50000) {
                                            html = html.substring(0, 50000) + "... (truncated)";
                                        }
                                        
                                        resultOutput = html;
                                    }
                                    
                                    // Update Browser State in DB
                                    if (currentSessionId) {
                                        // We might not have url/screenshot for all actions, but if we do, update.
                                        const updateData: any = { browserSessionId: currentSessionId };
                                        if (currentUrl) updateData.browserUrl = currentUrl;
                                        if (currentScreenshot) updateData.browserScreenshot = currentScreenshot;
                                        
                                        transactionOps.push(prisma.agentConversation.update({
                                            where: { id: conversationId },
                                            data: updateData
                                        }));

                                        // Update finalBrowserState for return
                                        if (!finalBrowserState) finalBrowserState = {};
                                        finalBrowserState.sessionId = currentSessionId;
                                        if (currentUrl) finalBrowserState.url = currentUrl;
                                        if (currentScreenshot) finalBrowserState.screenshot = currentScreenshot;
                                    }

                                } catch (e: any) {
                                    resultOutput = "Browser Error: " + e.message;
                                }
                            }

                            // --- User Tools ---
                            else {
                                const toolDef = conversation.tools.find(t => t.tool.id === call.id || t.tool.name === call.name);
                                if (toolDef) {
                                    // Check credits
                                    const user = await prisma.user.findUnique({
                                        where: { id: userId },
                                        select: { credits: true }
                                    });

                                    if (!user || user.credits <= 0) {
                                        resultOutput = "Error: Insufficient credits.";
                                    } else {
                                        transactionOps.push(prisma.user.update({
                                            where: { id: userId },
                                            data: { credits: { decrement: 1 } }
                                        }));
                                        
                                        // Get or create API Token for the user to inject into the tool
                                        let apiToken = await prisma.apiToken.findFirst({
                                            where: { userId: userId },
                                            orderBy: { createdAt: 'desc' }
                                        });

                                        if (!apiToken) {
                                            // Auto-generate a token for agent usage
                                            const token = "sk-" + crypto.randomUUID();
                                            apiToken = await prisma.apiToken.create({
                                                data: {
                                                    name: "Agent Auto-Token",
                                                    userId: userId,
                                                    token: token
                                                }
                                            });
                                        }

                                        // Execute Tool via Sandbox or API
                                        // For now, we assume all tools are sandbox-compatible or we have a handler
                                        // Actually, we should use `executeTool` helper if available, or direct execution
                                        // For this prototype, let's assume we have a generic executor.
                                        // But wait, `executeCode` is for raw code. We need to run the tool's code.
                                        
                                        // Fetch tool code
                                        const tool = toolDef.tool;
                                        
                                        // Prepare inputs
                                        const inputs = call.arguments || {};
                                        
                                        // Execute
                                        // We use the `executeCode` from sandbox, wrapping the tool's code
                                        // The tool code is expected to be a function or script that takes inputs.
                                        // We need a wrapper that injects inputs.
                                        
                                        const wrappedCode = wrapCode(tool.code, inputs);
                                        const result = await executeCode(wrappedCode,50000,apiToken.token);
                                        
                                        resultOutput = result.stdout || result.stderr || "(No output)";
                                    }
                                } else {
                                    resultOutput = "Tool not found or not enabled.";
                                }
                            }

                            // Append to cumulative output for next prompt
                            toolOutputs += `Tool '${call.name}' Output:\n${resultOutput}\n\n`;

                            // 3. Save to Database (BUFFERED)
                            // Save Assistant Call
                            transactionOps.push(prisma.agentMessage.create({
                                data: {
                                    conversationId,
                                    role: 'assistant',
                                    content: JSON.stringify({
                                        type: 'tool_call',
                                        tool: call.name,
                                        args: call.arguments
                                    })
                                }
                            }));

                            // Save System Result
                            transactionOps.push(prisma.agentMessage.create({
                                data: {
                                    conversationId,
                                    role: 'system',
                                    content: JSON.stringify({
                                        type: 'tool_result',
                                        tool: call.name,
                                        output: resultOutput
                                    })
                                }
                            }));
                        }

                        if (transactionOps.length > 0) {
                            await prisma.$transaction(transactionOps);
                        }

                        // 4. Feed results back to AI for next turn
                        messages.push({
                            role: 'user',
                            content: `Tool Execution Results:\n${toolOutputs}\nPlease continue answering the user request based on these results.`
                        });

                        // Continue loop to get next AI response
                        continue;
                    }
                 } catch (e) {
                     console.error("Error processing tool calls:", e);
                     // Error processing tool calls, treat as final text response
                 }
            }

            // If we get here, it's a final text response (or invalid JSON treated as text)
            await prisma.agentMessage.create({
                data: {
                    conversationId,
                    role: 'assistant',
                    content: aiContent
                }
            });
            
            // Break the loop since we have a final answer
            break;
        }

    } catch (error: any) {
        console.error("AI Error:", error);
        throw new Error("Failed to generate response: " + error.message);
    }

    await CacheService.del(`agent:conversation:${conversationId}`);
    await CacheService.del(`agent:conversations:${userId}`);
    revalidatePath(`/agent/${conversationId}`);
    
    // Return structured response
    return {
        content: lastContent,
        browserState: finalBrowserState
    };
}

export async function uploadAgentFile(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  
  const file = formData.get("file") as File;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file) throw new Error("No file provided");

  // Prepare data
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const key = FileStorage.getFileKey(userId, id);
  const content = await extractText(buffer, file.type);
  const name = Buffer.from(file.name, "latin1").toString("utf8");

  // Upload to S3 (outside transaction)
  await FileStorage.uploadFile(key, buffer, file.type);

  // DB Transaction
  const result = await withTransaction(async (tx) => {
      // 1. Find or Create "Agent Chat Uploads" folder
      let folder = await tx.folder.findFirst({
          where: {
              userId: userId,
              name: "Agent Chat Uploads",
              parentId: null
          }
      });

      if (!folder) {
          folder = await tx.folder.create({
              data: {
                  name: "Agent Chat Uploads",
                  userId: userId,
                  parentId: null
              }
          });
      }

      // 2. Create File Record
      const fileRecord = await tx.file.create({
        data: {
          id,
          name,
          size: file.size,
          mimeType: file.type,
          s3Key: key,
          content,
          userId: userId,
          folderId: folder.id,
        },
      });

      // 3. Create Public Link
      const token = crypto.randomUUID();
      await tx.fileShare.create({
          data: {
              fileId: fileRecord.id,
              isPublic: true,
              token,
          }
      });

      // 4. Link to Conversation if provided
      if (conversationId) {
          // Verify ownership
          const conversation = await tx.agentConversation.findUnique({
              where: { id: conversationId, userId: userId }
          });
          
          if (conversation) {
              await tx.conversationFile.create({
                  data: {
                      conversationId,
                      fileId: fileRecord.id
                  }
              });
          }
      }

      return { token, fileRecord };
  });

  if (conversationId) {
      await CacheService.del(`agent:conversation:${conversationId}`);
      revalidatePath(`/agent/${conversationId}`);
  }

  // 7. Return Info for Agent Context
  // We return the relative link so the client can construct the full URL
  const relativeUrl = `/share/${result.token}`;
  
  return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: relativeUrl,
      token: result.token,
      contentSummary: content ? content.substring(0, 200) + "..." : null
  };
}

export async function addFileToConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const conversation = await prisma.agentConversation.findUnique({
    where: { id: conversationId, userId: userId }
  });

  if (!conversation) throw new Error("Conversation not found");

  // Check if file exists and belongs to user
  const file = await prisma.file.findUnique({
    where: { id: fileId, userId: userId }
  });

  if (!file) throw new Error("File not found");

  // Check if already added
  const existing = await prisma.conversationFile.findUnique({
    where: {
      conversationId_fileId: {
        conversationId,
        fileId
      }
    }
  });

  if (!existing) {
    await prisma.conversationFile.create({
      data: {
        conversationId,
        fileId
      }
    });
  }

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeFileFromConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await prisma.conversationFile.deleteMany({
    where: {
      conversationId,
      fileId,
      conversation: {
        userId: userId
      }
    }
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}
