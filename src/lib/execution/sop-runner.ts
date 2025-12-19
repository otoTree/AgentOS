import { sopWorkflowRepository } from "@/lib/repositories/sop-workflow-repository";
import { sopExecutionRepository } from "@/lib/repositories/sop-execution-repository";
import { sopTaskRepository } from "@/lib/repositories/sop-task-repository";
import { SOPSequence } from "@/lib/ai/sop-types";
import { systemConfig } from "@/lib/infra/config";
import OpenAI from "openai";

export class SopRunner {
  static async executeWorkflow(workflowId: string, userId: string, inputs: any = {}) {
    // 1. Fetch Workflow
    const workflow = await sopWorkflowRepository.findById(workflowId);

    if (!workflow || workflow.userId !== userId) throw new Error("Workflow not found or access denied");

    const graph = workflow.graph as unknown as SOPSequence;
    if (!graph || !graph.steps) throw new Error("Invalid workflow graph");

    // 2. Create Execution Record
    const execution = await sopExecutionRepository.create({
        workflowId,
        userId,
        status: "RUNNING",
        context: inputs,
    });

    try {
        const apiKey = systemConfig.openai.apiKey;
        const baseURL = systemConfig.openai.baseUrl;
        const model = systemConfig.openai.model || "gpt-4o";

        if (!apiKey) throw new Error("OpenAI API Key not configured");

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL || undefined
        });

      for (const step of graph.steps) {
        // Update Execution Status (Current Node)
        await sopExecutionRepository.update(execution.id, {
            currentNodeId: step.id
        });

        // Filter context based on dependencies
        let contextToPrompt = inputs;
        if (step.dependencies && step.dependencies.length > 0) {
            const filtered: Record<string, any> = {};
            Object.keys(inputs).forEach(key => {
                if (!key.startsWith('step_')) {
                    filtered[key] = inputs[key];
                }
            });
            
            step.dependencies.forEach(depId => {
                const key = `step_${depId}_output`;
                if (inputs[key]) {
                    filtered[key] = inputs[key];
                }
            });
            contextToPrompt = filtered;
        }

        // Create Task Record
        const task = await sopTaskRepository.create({
            executionId: execution.id,
            nodeId: step.id,
            type: "AI_GENERATED",
            name: step.name,
            status: "IN_PROGRESS",
            ownerId: userId,
            input: contextToPrompt,
        });

        // Prepare Prompt
        const systemPrompt = `You are an AI executing an SOP. Step: ${step.name}. Context provided below.`;
        const userPrompt = `${step.prompt}\n\nContext: ${JSON.stringify(contextToPrompt)}`;

        // Execute Agent (Direct OpenAI call)
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        });
        
        const content = response.choices[0].message.content || "";

        // Update Task Record
        await sopTaskRepository.update(task.id, {
            status: "COMPLETED",
            output: { content: content },
        });

        // Update Context (Blackboard)
        inputs[`step_${step.id}_output`] = content;
        await sopExecutionRepository.update(execution.id, {
            context: inputs
        });
      }

      // Mark Execution as Completed
      await sopExecutionRepository.update(execution.id, {
          status: "COMPLETED",
          currentNodeId: undefined // or empty string/null logic
      });

      return { executionId: execution.id, status: "COMPLETED", results: inputs };

    } catch (error: any) {
      console.error("SOP Execution Failed:", error);
      await sopExecutionRepository.update(execution.id, {
          status: "FAILED"
      });
      throw error;
    }
  }
}
