import { db } from '../../database';
import { tasks, aiModels } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { sandboxManager } from './sandbox-manager';
import { ServiceLLMClient } from '../ai/adapter';
import { skillService } from '../skill/service';
import { createFileTools } from '../tool/file';

export class AgentRuntime {
    
    async execute(taskId: string) {
        // 1. Load Task
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId)
        });
        
        if (!task || task.type !== 'agent') {
            throw new Error(`Task ${taskId} is not a valid agent task`);
        }
        
        // Update status
        await db.update(tasks)
            .set({ status: 'processing', updatedAt: new Date() } as any)
            .where(eq(tasks.id, taskId));

        // 2. Setup Context
        let context = (task.pipelineContext as any) || { messages: [], iterations: 0 };
        const agentProfile = task.agentProfile as any;
        const skillIds = (task.skillIds as string[]) || [];
        
        // System Prompt
        const systemPrompt = `You are ${agentProfile?.name || 'Agent'}, ${agentProfile?.role || 'an AI assistant'}.
Goal: ${agentProfile?.goal || 'Help the user.'}
Instruction: ${task.instruction}

You have access to a set of skills. Use them to achieve the goal.
When you have completed the task, call the "task_completed" tool.
`;

        if (context.messages.length === 0) {
            context.messages.push({ role: 'system', content: systemPrompt });
            context.messages.push({ role: 'user', content: task.instruction });
        }
        
        // 3. Load Skills & Tools
        const skills = await Promise.all(skillIds.map(id => skillService.getSkill(id)));
        const fileTools = createFileTools(task.teamId, 'system');

        const tools = [
            ...skills.map(s => ({
                type: 'function',
                function: {
                    name: s.name,
                    description: s.description,
                    parameters: s.meta.input_schema || { type: 'object', properties: {} }
                }
            })),
            ...fileTools.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.jsonSchema || { type: 'object', properties: {} }
                }
            }))
        ];
        
        // Add built-in control tools
        tools.push({
            type: 'function',
            function: {
                name: 'task_completed',
                description: 'Call this when you have successfully completed the task.',
                parameters: {
                    type: 'object',
                    properties: {
                        result: { type: 'string', description: 'Final result summary' }
                    },
                    required: ['result']
                }
            }
        });

        // 4. Initialize LLM
        // For now, hardcode a model or get from settings. 
        // We need a robust way to select model.
        // Let's pick the first active model for now.
        const model = await db.query.aiModels.findFirst({
             where: eq(aiModels.isActive, true)
        });
        if (!model) throw new Error('No active AI model found');
        
        const llm = new ServiceLLMClient(model.id);

        // 5. Execution Loop
        const MAX_ITERATIONS = 20;
        
        while (context.iterations < MAX_ITERATIONS) {
            context.iterations++;
            console.log(`[AgentRuntime] Iteration ${context.iterations} for task ${taskId}`);
            
            try {
                // Call LLM
                // Note: ServiceLLMClient expects OpenAI format tools (array of objects), but chatComplete handles format.
                // The adapter implementation passes tools directly to OpenAI API.
                // Our tools array is already in OpenAI format { type: 'function', function: ... }
                
                const response = await llm.chat(context.messages, tools as any);
                
                // Add Assistant Message
                const assistantMsg = {
                    role: 'assistant',
                    content: response.content,
                    tool_calls: response.toolCalls
                };
                context.messages.push(assistantMsg);
                
                // Handle Tool Calls
                if (response.toolCalls && response.toolCalls.length > 0) {
                    for (const toolCall of response.toolCalls) {
                        const { id, name, arguments: args } = toolCall as any;
                        
                        if (name === 'task_completed') {
                            // Task Done
                            await db.update(tasks)
                                .set({ 
                                    status: 'completed', 
                                    result: args.result,
                                    pipelineContext: context,
                                    updatedAt: new Date()
                                } as any)
                                .where(eq(tasks.id, taskId));
                            return; // Exit
                        }
                        
                        // Find Skill
                        const skill = skills.find(s => s.name === name);
                        const fileTool = fileTools.find(t => t.name === name);
                        let result: any;
                        
                        if (skill) {
                            console.log(`[AgentRuntime] Executing skill ${name}`);
                            try {
                                result = await sandboxManager.runSkill(taskId, skill.id, args);
                            } catch (e: any) {
                                result = { error: e.message };
                            }
                        } else if (fileTool) {
                            console.log(`[AgentRuntime] Executing file tool ${name}`);
                            try {
                                result = await fileTool.execute(args);
                            } catch (e: any) {
                                result = { error: e.message };
                            }
                        } else {
                            result = { error: `Skill ${name} not found` };
                        }
                        
                        // Add Tool Message
                        context.messages.push({
                            role: 'tool',
                            tool_call_id: id,
                            content: JSON.stringify(result)
                        });
                    }
                } else {
                    // Heuristic: If no tool calls and no task_completed, append a system reminder?
                    context.messages.push({
                        role: 'user',
                        content: "Please proceed with the next step or call 'task_completed' if finished."
                    });
                }
                
                // Save State
                await db.update(tasks)
                    .set({ pipelineContext: context } as any)
                    .where(eq(tasks.id, taskId));
                    
            } catch (error: any) {
                console.error(`[AgentRuntime] Error:`, error);
                await db.update(tasks)
                    .set({ 
                        status: 'failed', 
                        error: error.message,
                        pipelineContext: context,
                        updatedAt: new Date()
                    } as any)
                    .where(eq(tasks.id, taskId));
                return;
            }
        }
        
        // Max iterations reached
        await db.update(tasks)
            .set({ 
                status: 'failed', 
                error: 'Max iterations reached',
                pipelineContext: context,
                updatedAt: new Date()
            } as any)
            .where(eq(tasks.id, taskId));
    }
}

export const agentRuntime = new AgentRuntime();
