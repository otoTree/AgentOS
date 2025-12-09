import { 
  ExecutionContext, 
  TaskNode, 
  SopNodeType, 
  AgentType, 
  InteractNodeSchema,
  ReasoningNodeSchema,
  ActionNodeSchema,
  AgentNodeSchema
} from './sop-types';
import { PrismaClient } from '@prisma/client';
import { generateCode } from '@/lib/ai/ai'; // Assuming this is for LLM calls

const prisma = new PrismaClient();

export interface NodeExecutorResult {
  context: ExecutionContext;
  status: 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED';
  output?: Record<string, any>;
}

export abstract class BaseNodeExecutor {
  protected node: TaskNode;
  protected currentContext: ExecutionContext;
  protected executionId: string;
  protected userId: string;

  constructor(node: TaskNode, currentContext: ExecutionContext, executionId: string, userId: string) {
    this.node = node;
    this.currentContext = currentContext;
    this.executionId = executionId;
    this.userId = userId;
  }

  abstract execute(): Promise<NodeExecutorResult>;

  protected updateContextWithOutput(output: Record<string, any>): ExecutionContext {
    return {
      ...this.currentContext,
      tasks: {
        ...this.currentContext.tasks,
        [this.node.id]: { output: output },
      },
    };
  }
}

export class InteractNodeExecutor extends BaseNodeExecutor {
  async execute(): Promise<NodeExecutorResult> {
    const node = InteractNodeSchema.parse(this.node);
    console.log(`Executing INTERACT node: ${node.id}`);

    try {
      // TODO: Integrate with actual LLM call for interaction
      // For now, simulate a response
      const llmResponse = await generateCode(
        node.prompt, // Use the prompt from the node
        '', // currentCode, not relevant for chat interaction
        this.currentContext.history.map(msg => ({ role: msg.role, content: msg.content })),
        { apiKey: process.env.OPENAI_API_KEY } // Or fetch from user settings
      );

      const output = { message: llmResponse.message };
      return {
        context: this.updateContextWithOutput(output),
        status: 'COMPLETED',
        output: output,
      };
    } catch (error) {
      console.error(`Error in INTERACT node ${node.id}:`, error);
      return { context: this.currentContext, status: 'FAILED' };
    }
  }
}

export class ReasoningNodeExecutor extends BaseNodeExecutor {
  async execute(): Promise<NodeExecutorResult> {
    const node = ReasoningNodeSchema.parse(this.node);
    console.log(`Executing REASONING node: ${node.id}`);

    // TODO: Implement robust logic_script evaluation
    // For now, simulate a decision based on a simple condition
    let decision = 'default';
    if (this.currentContext.global.someCondition === true) {
      decision = 'conditionMet';
    }

    const output = { decision: decision };
    return {
      context: this.updateContextWithOutput(output),
      status: 'COMPLETED',
      output: output,
    };
  }
}

export class ActionNodeExecutor extends BaseNodeExecutor {
  async execute(): Promise<NodeExecutorResult> {
    const node = ActionNodeSchema.parse(this.node);
    console.log(`Executing ACTION node: ${node.id}`);

    // TODO: Implement actual action execution (API call, DB query, code block)
    // This will likely involve dynamic import or a registry of actions
    const result = { status: 'success', data: 'simulated action result' };

    const output = { result: result };
    return {
      context: this.updateContextWithOutput(output),
      status: 'COMPLETED',
      output: output,
    };
  }
}

export class HumanNodeExecutor extends BaseNodeExecutor {
  async execute(): Promise<NodeExecutorResult> {
    const node = AgentNodeSchema.parse(this.node);
    console.log(`Executing HUMAN_INTERACTION node: ${node.id}`);

    if (node.agent_type !== AgentType.HUMAN_INTERACTION) {
      console.error(`Invalid agent type for HumanNodeExecutor: ${node.agent_type}`);
      return { context: this.currentContext, status: 'FAILED' };
    }

    // Assign the task to the current user and suspend the workflow
    await prisma.sopTask.updateMany({
      where: {
        executionId: this.executionId,
        nodeId: this.node.id,
        status: 'IN_PROGRESS', // Assuming it was set to IN_PROGRESS when executeStep started
      },
      data: {
        status: 'WAITING_FOR_HUMAN',
        assignedToUserId: this.userId,
      },
    });

    const output = { humanTaskConfig: node.config }; // Pass the config to the UI
    return {
      context: this.updateContextWithOutput(output),
      status: 'SUSPENDED',
      output: output,
    };
  }
}

export class SubSopNodeExecutor extends BaseNodeExecutor {
  async execute(): Promise<NodeExecutorResult> {
    const node = AgentNodeSchema.parse(this.node);
    console.log(`Executing SUB_SOP node: ${node.id}`);

    if (node.agent_type !== AgentType.SUB_SOP) {
      console.error(`Invalid agent type for SubSopNodeExecutor: ${node.agent_type}`);
      return { context: this.currentContext, status: 'FAILED' };
    }

    // TODO: Implement sub-SOP execution logic
    // This would involve fetching the sub-SOP definition and running a new WorkflowEngine instance
    const subSopResult = { message: `Simulated result from SUB_SOP node ${node.id}` };

    const output = { subSopResult: subSopResult };
    return {
      context: this.updateContextWithOutput(output),
      status: 'COMPLETED',
      output: output,
    };
  }
}