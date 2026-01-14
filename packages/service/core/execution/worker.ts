import { queueService } from './queue';
import { pipelineRuntime } from './pipeline-runtime';
import { agentRuntime } from './agent-runtime';

export class ExecutionWorker {
    private static instance: ExecutionWorker;

    public static getInstance(): ExecutionWorker {
        if (!ExecutionWorker.instance) {
            ExecutionWorker.instance = new ExecutionWorker();
        }
        return ExecutionWorker.instance;
    }

    async start() {
        console.log('[ExecutionWorker] Starting...');
        await queueService.init();
        
        await queueService.subscribe('execution-queue', async (job: any) => {
            const { taskId, type } = job.data;
            console.log(`[ExecutionWorker] Received job for task ${taskId} (type: ${type})`);
            
            try {
                if (type === 'pipeline') {
                    await pipelineRuntime.execute(taskId);
                } else if (type === 'agent') {
                    await agentRuntime.execute(taskId);
                } else {
                    console.warn(`[ExecutionWorker] Unknown task type: ${type}`);
                }
            } catch (error) {
                console.error(`[ExecutionWorker] Failed to execute task ${taskId}:`, error);
                throw error; // Let pg-boss handle retry/fail
            }
        });
        
        console.log('[ExecutionWorker] Listening for jobs');
    }
}

export const executionWorker = ExecutionWorker.getInstance();
