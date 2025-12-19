'use server'

import { auth } from "@/auth";
import { chatRepository } from "@/lib/repositories/chat-repository";
import { toolRepository } from "@/lib/repositories/tool-repository";
import { fileRepository } from "@/lib/repositories/file-repository";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";
import { getUserConfig, systemConfig } from "@/lib/infra/config";
import OpenAI from 'openai';
import { generateSystemPrompt, prepareMessages } from "./prompt";
import { executeTool } from "./tool-handlers";
import { AgentConversation } from "@/lib/core/entities/chat";

export async function sendMessage(conversationId: string, message: string, context?: { browserSessionId?: string }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    // 1. Save User Message
    await chatRepository.addMessage(conversationId, {
        role: 'user',
        content: message
    });

    // Start background processing
    processAgentResponse(conversationId, userId, message, context).catch(e => {
        console.error("Error in background agent processing:", e);
    });

    await CacheService.del(`agent:conversation:${conversationId}`);
    revalidatePath(`/agent/${conversationId}`);

    return { status: 'queued' };
}

// Helper to reconstruct the full conversation object with tools and files
async function getConversationWithDetails(conversationId: string) {
    const conversation = await chatRepository.findById(conversationId);
    if (!conversation) return null;

    const toolIds = await chatRepository.getTools(conversationId);
    const fileIds = await chatRepository.getFiles(conversationId);

    // Fetch tool and file details
    // Ideally use findMany if available, or Promise.all
    const tools = (await Promise.all(toolIds.map(id => toolRepository.findById(id)))).filter(Boolean);
    const files = (await Promise.all(fileIds.map(id => fileRepository.findById(id)))).filter(Boolean);

    // Get messages (last 20 for context)
    const allMessages = await chatRepository.getMessages(conversationId);
    // Sort by createdAt just in case, though List is usually ordered
    const sortedMessages = allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const messages = sortedMessages.slice(-20);

    return {
        ...conversation,
        tools: tools.map(t => ({ tool: t })), // Match structure expected by executeTool or prompt
        files: files.map(f => ({ file: f })),
        messages: messages
    };
}

export async function processAgentResponse(conversationId: string, userId: string, message: string, context?: { browserSessionId?: string }) {
    // 2. Get Conversation Context
    const conversation = await getConversationWithDetails(conversationId);

    if (!conversation) throw new Error("Conversation not found");

    // Auto-generate title if it's "New Conversation" and we have first user message
    if (conversation.title === "New Conversation") {
        const messageCount = (await chatRepository.getMessages(conversationId)).length;
        if (messageCount <= 1) { // <= 1 because we just added the user message
             // Simple heuristic: take first 30 chars
             const newTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
             await chatRepository.update(conversationId, { title: newTitle });
        }
    }

    // 3. Prepare History
    // We already fetched messages in getConversationWithDetails, but for prepareMessages we might want all of them or more?
    // The original code fetched all messages again.
    const dbMessages = await chatRepository.getMessages(conversationId);
    const sortedDbMessages = dbMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const systemPrompt = generateSystemPrompt(conversation as any, context);
    const messages = prepareMessages(sortedDbMessages, systemPrompt);

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
        const maxTurns = Number(systemConfig.agent.maxTurns); // Prevent infinite loops

        for (let i = 0; i < maxTurns; i++) {
            const response = await openai.chat.completions.create({
                model: model,
                messages: messages as any,
                temperature: 0.2, // Lower temperature for reliable tool calling
            });

            const aiContent = response.choices[0].message.content || "";
            lastContent = aiContent;
            
            // Check if response contains a tool call (JSON format)
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
                        // 1. Add Assistant Message (Tool Request) to History
                        messages.push({ role: 'assistant', content: aiContent });

                        // 2. Execute Tools & Collect Outputs
                        let toolOutputs = "";
                        
                        // Limit number of tool calls to prevent loops/abuse
                        const callsToProcess = parsed.tool_calls.slice(0, 10);
                        
                        for (const call of callsToProcess) {
                            
                            const result = await executeTool(call, { conversationId, userId, conversation: conversation as any });
                            const resultOutput = result.output || "(No output)";

                            // Handle Browser State Updates
                            if (result.browserState) {
                                const updateData: any = { browserSessionId: result.browserState.sessionId };
                                if (result.browserState.url) updateData.browserUrl = result.browserState.url;
                                if (result.browserState.screenshot) updateData.browserScreenshot = result.browserState.screenshot;
                                
                                await chatRepository.update(conversationId, updateData);

                                if (!finalBrowserState) finalBrowserState = {};
                                finalBrowserState.sessionId = result.browserState.sessionId;
                                if (result.browserState.url) finalBrowserState.url = result.browserState.url;
                                if (result.browserState.screenshot) finalBrowserState.screenshot = result.browserState.screenshot;
                            }

                            // Append to cumulative output for next prompt
                            toolOutputs += `Tool '${call.name}' Output:\n${resultOutput}\n\n`;

                            // 3. Save to Database
                            // Save Assistant Call
                            await chatRepository.addMessage(conversationId, {
                                role: 'assistant',
                                content: JSON.stringify({
                                    type: 'tool_call',
                                    tool: call.name,
                                    args: call.arguments
                                })
                            });

                            // Save System Result
                            await chatRepository.addMessage(conversationId, {
                                role: 'system',
                                content: JSON.stringify({
                                    type: 'tool_result',
                                    tool: call.name,
                                    output: resultOutput
                                })
                            });
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
            await chatRepository.addMessage(conversationId, {
                role: 'assistant',
                content: aiContent
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
