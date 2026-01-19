import { db } from '../../database';
import { tasks } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { sandboxManager } from './sandbox-manager';

export type PipelineStep = {
    id: string;
    skillId: string;
    name: string;
    args: Record<string, any>;
}

export type PipelineDefinition = {
    steps: PipelineStep[];
}

export type StepContext = {
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: any;
    error?: string;
}

export type PipelineContext = {
    steps: Record<string, StepContext>;
}

export class PipelineRuntime {
    
    async execute(taskId: string) {
        // 1. Load Task
        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, taskId)
        });
        
        if (!task || task.type !== 'pipeline') {
            throw new Error(`Task ${taskId} is not a valid pipeline task`);
        }
        
        // Update status to processing
        await db.update(tasks)
            .set({ status: 'processing', updatedAt: new Date() } as any)
            .where(eq(tasks.id, taskId));
            
        const definition = task.pipelineDefinition as unknown as PipelineDefinition;
        const context = (task.pipelineContext as unknown as PipelineContext) || { steps: {} };
        
        try {
            // 2. Iterate Steps
            for (const step of definition.steps) {
                console.log(`[PipelineRuntime] Executing step: ${step.id} (${step.name})`);
                
                // Init step context
                context.steps[step.id] = { status: 'running' };
                await this.saveContext(taskId, context);
                
                try {
                    // Resolve Args
                    const args = this.resolveArgs(step.args, context);
                    
                    // Run Skill
                    console.log(`[PipelineRuntime] Running skill ${step.skillId} with args:`, JSON.stringify(args));
                    const result = await sandboxManager.runSkill(taskId, step.skillId, args);
                    
                    // Update Context
                    context.steps[step.id] = {
                        status: 'completed',
                        output: result
                    };
                } catch (error: any) {
                    console.error(`[PipelineRuntime] Step ${step.id} failed:`, error);
                    context.steps[step.id] = {
                        status: 'failed',
                        error: error.message
                    };
                    throw error; // Stop pipeline
                }
                
                await this.saveContext(taskId, context);
            }
            
            // 3. Complete Task
            await db.update(tasks)
                .set({ 
                    status: 'completed', 
                    result: 'Pipeline executed successfully',
                    updatedAt: new Date() 
                } as any)
                .where(eq(tasks.id, taskId));
                
        } catch (error: any) {
            console.error(`[PipelineRuntime] Task ${taskId} failed:`, error);
            await db.update(tasks)
                .set({ 
                    status: 'failed', 
                    error: error.message,
                    updatedAt: new Date() 
                } as any)
                .where(eq(tasks.id, taskId));
        }
    }
    
    private async saveContext(taskId: string, context: PipelineContext) {
        await db.update(tasks)
            .set({ pipelineContext: context } as any)
            .where(eq(tasks.id, taskId));
    }
    
    private resolveArgs(args: any, context: PipelineContext): any {
        if (typeof args === 'string') {
            // Check if it's a direct variable reference "{{path}}"
            if (args.match(/^\{\{([^}]+)\}\}$/)) {
                 const path = args.slice(2, -2).trim();
                 return this.getValueByPath(context, path);
            }
            
            // String interpolation "Prefix {{path}} Suffix"
            return args.replace(/\{\{(.*?)\}\}/g, (_, path) => {
                const val = this.getValueByPath(context, path.trim());
                return val !== undefined ? String(val) : '';
            });
        } else if (Array.isArray(args)) {
            return args.map(item => this.resolveArgs(item, context));
        } else if (typeof args === 'object' && args !== null) {
            const newArgs: any = {};
            for (const key in args) {
                newArgs[key] = this.resolveArgs(args[key], context);
            }
            return newArgs;
        }
        return args;
    }
    
    private getValueByPath(obj: any, path: string) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
}

export const pipelineRuntime = new PipelineRuntime();
