'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { SOPStep } from "@/lib/ai/sop-types";
import { systemConfig } from "@/lib/infra/config";
import OpenAI from "openai";
import { getToolDefinitions } from "./modules/prompt";
import { executeTool } from "./modules/tool-handlers";

export async function startSopExecution(workflowId?: string, title?: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const execution = await prisma.sopExecution.create({
        data: {
            userId: session.user.id,
            workflowId: workflowId || undefined,
            status: "RUNNING",
            context: {},
        }
    });

    return execution;
}

export async function executeSopStep(
    executionId: string, 
    step: SOPStep, 
    previousContext: Record<string, any> = {}
) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    const userId = session.user.id;

    // Fetch existing execution context
    let currentContext = { ...previousContext };
    try {
        const execution = await prisma.sopExecution.findUnique({
            where: { id: executionId },
            select: { context: true }
        });
        if (execution?.context) {
            currentContext = { ...(execution.context as object), ...currentContext };
        }
    } catch (e) {
        console.warn("Could not fetch execution context", e);
    }

    // Filter context based on dependencies
    let contextToPrompt = currentContext;
    if (step.dependencies && step.dependencies.length > 0) {
        const filtered: Record<string, any> = {};
        // Always keep non-step keys (assumed to be initial inputs or global context)
        Object.keys(currentContext).forEach(key => {
            if (!key.startsWith('step_')) {
                filtered[key] = currentContext[key];
            }
        });
        
        // Add specific step outputs
        step.dependencies.forEach(depId => {
            const key = `step_${depId}_output`;
            if (currentContext[key]) {
                filtered[key] = currentContext[key];
            }
        });
        contextToPrompt = filtered;
    }

    // Create Task record
    const task = await prisma.sopTask.create({
        data: {
            executionId,
            nodeId: step.id,
            type: "INTERACT", // Defaulting to INTERACT for now
            name: step.name,
            status: "IN_PROGRESS",
            ownerId: session.user.id,
            input: { prompt: step.prompt, ...contextToPrompt }
        }
    });

    try {
        // Prepare AI Call
        const apiKey = systemConfig.openai.apiKey;
        const baseURL = systemConfig.openai.baseUrl;
        const model = systemConfig.openai.model || "gpt-4o";

        if (!apiKey) {
            throw new Error("OpenAI API Key is not configured.");
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL || undefined
        });

        // Construct System Prompt with Tools
        const toolDefinitions = getToolDefinitions(); // Get standard tools
        
        let systemPrompt = `You are an AI agent executing a Standard Operating Procedure (SOP).
You are currently executing step: "${step.name}".
Description: ${step.description}

${toolDefinitions}

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

Please execute the instructions in the prompt below.`;

        if (Object.keys(contextToPrompt).length > 0) {
            systemPrompt += `\n\nContext from previous steps:\n${JSON.stringify(contextToPrompt, null, 2)}`;
        }

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: step.prompt }
        ];

        let finalOutput = "";
        const maxTurns = 10; // Limit turns for SOP

        for (let i = 0; i < maxTurns; i++) {
            const response = await openai.chat.completions.create({
                model: model,
                messages: messages,
                temperature: 0.2, // Lower temperature for reliable tool calling
            });

            const aiContent = response.choices[0].message.content || "";
            finalOutput = aiContent;

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
                messages.push({ role: 'assistant', content: aiContent });
                let toolOutputs = "";
                
                // Process tools
                for (const call of parsed.tool_calls) {
                    try {
                        // We use a dummy conversation ID and object because SOP doesn't have one yet.
                        // Most tools rely on userId.
                        const result = await executeTool(call, { 
                            conversationId: "sop_execution_" + executionId, 
                            userId: userId, 
                            conversation: { tools: [] } 
                        });
                        
                        toolOutputs += `Tool '${call.name}' Output:\n${result.output || "(No output)"}\n\n`;
                    } catch (err: any) {
                         toolOutputs += `Tool '${call.name}' Error:\n${err.message}\n\n`;
                    }
                }
                
                messages.push({
                    role: 'user',
                    content: `Tool Execution Results:\n${toolOutputs}\nPlease continue.`
                });
            } else {
                // No tool call, final response
                break;
            }
        }

        // Update Task
        await prisma.sopTask.update({
            where: { id: task.id },
            data: {
                status: "COMPLETED",
                output: { content: finalOutput }
            }
        });

        // Update Execution Context
        try {
            await prisma.sopExecution.update({
                where: { id: executionId },
                data: {
                    context: {
                        ...currentContext,
                        [`step_${step.id}_output`]: finalOutput
                    }
                }
            });
        } catch (e) {
            console.error("Failed to update execution context", e);
        }
        
        return {
            success: true,
            output: finalOutput,
            taskId: task.id
        };

    } catch (error: any) {
        console.error("SOP Step Execution Failed:", error);
        
        await prisma.sopTask.update({
            where: { id: task.id },
            data: {
                status: "FAILED",
                output: { error: error.message }
            }
        });

        throw new Error("Failed to execute step: " + error.message);
    }
}

export async function finishSopExecution(executionId: string, deliverables: any) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    await prisma.sopExecution.update({
        where: { id: executionId },
        data: {
            status: "COMPLETED",
            deliverables: deliverables
        }
    });
}

export async function getSopExecutions(workflowId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    return await prisma.sopExecution.findMany({
        where: { 
            workflowId,
            userId: session.user.id
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to recent 20
    });
}

export async function getSopExecution(executionId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    return await prisma.sopExecution.findUnique({
        where: { id: executionId },
        include: {
            tasks: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}
