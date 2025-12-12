'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";
import { getUserConfig, systemConfig } from "@/lib/infra/config";
import OpenAI from 'openai';
import { generateSystemPrompt, prepareMessages } from "./prompt";
import { executeTool } from "./tool-handlers";

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

    const systemPrompt = generateSystemPrompt(conversation, context);
    const messages = prepareMessages(dbMessages, systemPrompt);

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
                        const transactionOps: any[] = [];
                        // 1. Add Assistant Message (Tool Request) to History
                        messages.push({ role: 'assistant', content: aiContent });

                        // 2. Execute Tools & Collect Outputs
                        let toolOutputs = "";
                        
                        // Limit number of tool calls to prevent loops/abuse
                        const callsToProcess = parsed.tool_calls.slice(0, 10);
                        
                        for (const call of callsToProcess) {
                            
                            const result = await executeTool(call, { conversationId, userId, conversation });
                            const resultOutput = result.output || "(No output)";

                            // Handle Browser State Updates
                            if (result.browserState) {
                                const updateData: any = { browserSessionId: result.browserState.sessionId };
                                if (result.browserState.url) updateData.browserUrl = result.browserState.url;
                                if (result.browserState.screenshot) updateData.browserScreenshot = result.browserState.screenshot;
                                
                                transactionOps.push(prisma.agentConversation.update({
                                    where: { id: conversationId },
                                    data: updateData
                                }));

                                if (!finalBrowserState) finalBrowserState = {};
                                finalBrowserState.sessionId = result.browserState.sessionId;
                                if (result.browserState.url) finalBrowserState.url = result.browserState.url;
                                if (result.browserState.screenshot) finalBrowserState.screenshot = result.browserState.screenshot;
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
