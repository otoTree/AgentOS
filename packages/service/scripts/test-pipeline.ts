import { db } from '../database';
import { users, teams, tasks } from '../database/schema';
import { skillService } from '../core/skill/service';
import { executionWorker } from '../core/execution/worker';
import { queueService } from '../core/execution/queue';
import { eq } from 'drizzle-orm';

async function main() {
    // 0. Smoke Test Queue
    console.log('Smoke testing queue...');
    await executionWorker.start();
    
    await queueService.subscribe('smoke-test', async (job) => {
        console.log('SMOKE TEST RECEIVED:', job.data);
    });
    
    await queueService.addToQueue('smoke-test', { msg: 'hello' });
    console.log('Smoke test job queued');

    // 1. Setup Data
    console.log('Setting up test data...');
    
    // Create User & Team
    const [user] = await db.insert(users).values({
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        password: 'hash'
    } as any).returning();
    
    const [team] = await db.insert(teams).values({
        name: 'Test Team',
        ownerId: user.id
    }).returning();
    
    // 2. Create Skills
    console.log('Creating skills...');
    
    // Skill 1: Write File
    const writeSkill = await skillService.createSkill({
        teamId: team.id,
        ownerId: user.id,
        name: 'Write File'
    });
    
    // Update main.py for Write File
    await skillService.updateSkillFiles(writeSkill.id, {
        'src/main.py': `
import os

def main(filename: str, content: str):
    # Write to output dir
    output_path = f"/workspace/output/{filename}"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w") as f:
        f.write(content)
        
    return {"status": "created", "path": output_path}
`
    }, {
        entrypoint: 'src/main.py'
    });
    
    // Skill 2: Read File
    const readSkill = await skillService.createSkill({
        teamId: team.id,
        ownerId: user.id,
        name: 'Read File'
    });
    
    // Update main.py for Read File
    await skillService.updateSkillFiles(readSkill.id, {
        'src/main.py': `
def main(file_path: str):
    print(f"Reading file from: {file_path}")
    with open(file_path, "r") as f:
        content = f.read()
    return {"content": content}
`
    }, {
        entrypoint: 'src/main.py'
    });
    
    // 3. Create Pipeline Task
    console.log('Creating pipeline task...');
    
    const pipelineDefinition = {
        steps: [
            {
                id: 'step1',
                name: 'Generate File',
                skillId: writeSkill.id,
                args: {
                    filename: 'hello.txt',
                    content: 'Hello from Pipeline!'
                }
            },
            {
                id: 'step2',
                name: 'Read File',
                skillId: readSkill.id,
                args: {
                    // step1 output.artifacts is injected by SandboxManager
                    // Accessing the first artifact's fileId
                    file_path: 'file:{{steps.step1.output.artifacts.0.fileId}}' 
                }
            }
        ]
    };
    
    const [task] = await db.insert(tasks).values({
        teamId: team.id,
        type: 'pipeline',
        pipelineDefinition: pipelineDefinition,
        status: 'queued'
    } as any).returning();
    
    // 4. Start Worker & Push to Queue
    // console.log('Starting worker...');
    // await executionWorker.start();
    
    console.log('Pushing task to queue...');
    await queueService.addToQueue('execution-queue', {
        taskId: task.id,
        type: 'pipeline'
    });
    
    console.log(`Task ${task.id} queued. Waiting for completion...`);
    
    // 5. Poll Status
    let attempts = 0;
    const checkInterval = setInterval(async () => {
        attempts++;
        const currentTask = await db.query.tasks.findFirst({
            where: eq(tasks.id, task.id)
        });
        
        if (currentTask) {
            console.log(`[${attempts}] Task Status: ${currentTask.status}`);
            
            // Check context progress
            const ctx: any = currentTask.pipelineContext;
            if (ctx && ctx.steps) {
                const statuses = Object.keys(ctx.steps).map(k => `${k}:${ctx.steps[k].status}`).join(', ');
                console.log(`   Steps: ${statuses}`);
            }

            if (currentTask.status === 'completed') {
                console.log('Task Completed!');
                console.log('Final Context:', JSON.stringify(currentTask.pipelineContext, null, 2));
                
                // Verify output
                const step2Output = (currentTask.pipelineContext as any).steps.step2.output;
                if (step2Output.value.content === 'Hello from Pipeline!') {
                    console.log('SUCCESS: Content matched!');
                    process.exit(0);
                } else {
                    console.error('FAILURE: Content mismatch!', step2Output);
                    process.exit(1);
                }
                
                clearInterval(checkInterval);
            } else if (currentTask.status === 'failed') {
                console.error('Task Failed:', currentTask.error);
                clearInterval(checkInterval);
                process.exit(1);
            }
        }
        
        if (attempts > 30) { // Timeout after 60s
             console.error('Timeout!');
             process.exit(1);
        }
    }, 2000);
}

main().catch(console.error);
