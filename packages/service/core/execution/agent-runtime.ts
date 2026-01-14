import { db } from '../../database';
import { tasks, aiModels } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { sandboxManager } from './sandbox-manager';
import { ServiceLLMClient } from '../ai/adapter';
import { skillService } from '../skill/service';
import { createFileTools } from '../tool/file';
import { SkillManager, LoadSkillChunkTool } from '@agentos/agent';

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
        let context = (task.pipelineContext as any) || { messages: [], iterations: 0, activeChunks: {} };
        const agentProfile = task.agentProfile as any;
        const skillIds = (task.skillIds as string[]) || [];

        // 3. Load Skills & Docs & Init Manager
        const skillsData = await Promise.all(skillIds.map(async id => {
            const skill = await skillService.getSkill(id);
            const doc = await skillService.getSkillDoc(id);
            return { ...skill, doc };
        }));

        const skillManager = new SkillManager();
        skillsData.forEach(s => {
            if (s.doc) {
                skillManager.registerSkill(s.doc);
            } else {
                // Fallback: Register a minimal skill from meta if no doc exists
                // This ensures it appears in the prompt even without SKILL.md
                const minimalDoc = `---
name: ${s.name}
description: ${s.description || ''}
---
# ${s.name}
${s.description || 'No description available.'}
`;
                skillManager.registerSkill(minimalDoc);
            }
        });

        // Restore active chunks from context
        if (context.activeChunks) {
            for (const [skillName, chunks] of Object.entries(context.activeChunks)) {
                if (Array.isArray(chunks)) {
                    chunks.forEach((chunkId: string) => {
                        try { skillManager.activateChunk(skillName, chunkId); } catch (e) { console.warn(e); }
                    });
                }
            }
        }
        
        // System Prompt
        const skillsPrompt = skillManager.getSkillsPrompt();
        const systemPrompt = `You are ${agentProfile?.name || 'Agent'}, ${agentProfile?.role || 'an AI assistant'}.
Goal: ${agentProfile?.goal || 'Help the user.'}
Instruction: ${task.instruction}

You have access to a set of skills. Use them to achieve the goal.

## Skills Documentation
${skillsPrompt}

When you have completed the task, call the "task_completed" tool.
`;

        if (context.messages.length === 0) {
            context.messages.push({ role: 'system', content: systemPrompt });
            context.messages.push({ role: 'user', content: task.instruction });
        } else {
            // Update system prompt to reflect loaded chunks
            if (context.messages[0].role === 'system') {
                context.messages[0].content = systemPrompt;
            }
        }
        
        // 4. Load Tools
        const fileTools = createFileTools(task.teamId, 'system');
        const loadSkillTool = new LoadSkillChunkTool(skillManager);

        const tools: any[] = [
            ...skillsData.map(s => ({
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
            })),
            // Load Skill Chunk Tool
            {
                type: 'function',
                function: {
                    name: loadSkillTool.name,
                    description: loadSkillTool.description,
                    parameters: {
                        type: 'object',
                        properties: {
                            skill_name: { type: 'string', description: 'The name of the skill' },
                            chunk_id: { type: 'string', description: 'The ID of the chunk to load' }
                        },
                        required: ['skill_name', 'chunk_id']
                    }
                }
            }
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

        // 5. Initialize LLM
        // For now, hardcode a model or get from settings. 
        // We need a robust way to select model.
        // Let's pick the first active model for now.
        const model = await db.query.aiModels.findFirst({
             where: eq(aiModels.isActive, true)
        });
        if (!model) throw new Error('No active AI model found');
        
        const llm = new ServiceLLMClient(model.id);

        // 6. Execution Loop
        const MAX_ITERATIONS = 20;
        
        while (context.iterations < MAX_ITERATIONS) {
            context.iterations++;
            console.log(`[AgentRuntime] Iteration ${context.iterations} for task ${taskId}`);
            
            try {
                // Call LLM
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

                        let result: any;

                        if (name === 'load_skill_chunk') {
                            console.log(`[AgentRuntime] Loading chunk ${args.chunk_id} for skill ${args.skill_name}`);
                            try {
                                result = await loadSkillTool.execute(args);
                                // Update active chunks in context for persistence
                                if (!context.activeChunks) context.activeChunks = {};
                                if (!context.activeChunks[args.skill_name]) context.activeChunks[args.skill_name] = [];
                                if (!context.activeChunks[args.skill_name].includes(args.chunk_id)) {
                                    context.activeChunks[args.skill_name].push(args.chunk_id);
                                }
                            } catch (e: any) {
                                result = { error: e.message };
                            }
                        } else {
                            // Find Skill
                            const skill = skillsData.find(s => s.name === name);
                            const fileTool = fileTools.find(t => t.name === name);
                            
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
