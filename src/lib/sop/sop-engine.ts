import {
  WorkflowDefinition,
  ExecutionContext,
  TaskNode,
  SopNodeType,
  AgentType,
  HumanTaskConfig
} from './sop-types';
import { PrismaClient } from '@prisma/client';
import {
  BaseNodeExecutor,
  InteractNodeExecutor,
  ReasoningNodeExecutor,
  ActionNodeExecutor,
  HumanNodeExecutor,
  SubSopNodeExecutor,
  NodeExecutorResult
} from './sop-node-executors';

const prisma = new PrismaClient();

export class WorkflowEngine {
  private workflowDefinition: WorkflowDefinition;
  private executionId: string;
  private userId: string;

  constructor(workflowDefinition: WorkflowDefinition, executionId: string, userId: string) {
    this.workflowDefinition = workflowDefinition;
    this.executionId = executionId;
    this.userId = userId;
  }

  /**
   * Resolves variables in a given template string using the current execution context.
   * Supports `{{ global.variableName }}` and `{{ tasks.taskId.output.propertyName }}`.
   * @param template The string template with variables.
   * @param context The current execution context.
   * @returns The string with variables replaced by their actual values.
   */
  private resolveVariables(template: string, context: ExecutionContext): string {
    let resolvedString = template;

    // Resolve global variables: {{ global.variableName }}
    resolvedString = resolvedString.replace(/\{\{\s*global\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, globalVarName) => {
      const value = context.global[globalVarName];
      return value !== undefined ? String(value) : match; // Return original match if not found
    });

    // Resolve task outputs: {{ tasks.taskId.output.propertyName }}
    resolvedString = resolvedString.replace(/\{\{\s*tasks\.([a-zA-Z0-9_]+)\.output\.([a-zA-Z0-9_]+)\s*\}\}/g, (match, taskId, propName) => {
      const taskOutput = context.tasks[taskId]?.output;
      if (taskOutput && taskOutput[propName] !== undefined) {
        return String(taskOutput[propName]);
      }
      return match; // Return original match if not found
    });

    return resolvedString;
  }

  /**
   * Executes a single step (node) in the workflow.
   * @param nodeId The ID of the node to execute.
   * @param currentContext The current execution context.
   * @returns A promise that resolves to the updated execution context and a status indicating if the workflow is suspended.
   */
  public async executeStep(nodeId: string, currentContext: ExecutionContext): Promise<NodeExecutorResult> {
    const node = this.workflowDefinition.nodes.find(n => n.id === nodeId);

    if (!node) {
      console.error(`Node with ID ${nodeId} not found.`);
      return { context: currentContext, status: 'FAILED' };
    }

    // Create a new SopTask record for this execution step
    const sopTask = await prisma.sopTask.create({
      data: {
        executionId: this.executionId,
        nodeId: node.id,
        type: node.type,
        name: node.name,
        status: 'IN_PROGRESS',
        ownerId: this.userId, // The user who initiated the workflow owns this task
        input: currentContext as any, // Store the context at the start of the task
      },
    });

    let executor: BaseNodeExecutor;
    let result: NodeExecutorResult;

    try {
      switch (node.type) {
        case SopNodeType.INTERACT:
          executor = new InteractNodeExecutor(node, currentContext, this.executionId, this.userId);
          break;
        case SopNodeType.REASONING:
          executor = new ReasoningNodeExecutor(node, currentContext, this.executionId, this.userId);
          break;
        case SopNodeType.ACTION:
          executor = new ActionNodeExecutor(node, currentContext, this.executionId, this.userId);
          break;
        case SopNodeType.AGENT:
          if (node.agent_type === AgentType.HUMAN_INTERACTION) {
            executor = new HumanNodeExecutor(node, currentContext, this.executionId, this.userId);
          } else if (node.agent_type === AgentType.SUB_SOP) {
            executor = new SubSopNodeExecutor(node, currentContext, this.executionId, this.userId);
          } else {
            console.warn(`Unknown agent type: ${(node as any).agent_type} for AGENT node: ${node.id}`);
            return { context: currentContext, status: 'FAILED' };
          }
          break;
        default:
          console.warn(`Unknown node type: ${(node as any).type}`);
          return { context: currentContext, status: 'FAILED' };
      }

      result = await executor.execute();

      // Update the SopTask with the output and mark as completed (unless suspended)
      if (result.status !== 'SUSPENDED') {
        await prisma.sopTask.update({
          where: { id: sopTask.id },
          data: {
            status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED', // Ensure status is explicitly set
            output: result.output as any, // Store the task's output
          },
        });
      }

      return result;

    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error);
      await prisma.sopTask.update({
        where: { id: sopTask.id },
        data: { status: 'FAILED', output: { error: String(error) } as any },
      });
      return { context: currentContext, status: 'FAILED' };
    }
  }

  /**
   * Resumes a suspended workflow execution.
   * @param nodeId The ID of the human node that was suspended.
   * @param humanInput The input provided by the human.
   * @param currentContext The context at the time of suspension.
   * @returns A promise that resolves to the updated execution context and a status.
   */
  public async resumeExecution(nodeId: string, humanInput: any, currentContext: ExecutionContext): Promise<{ context: ExecutionContext; status: 'RUNNING' | 'SUSPENDED' | 'COMPLETED' | 'FAILED' }> {
    const node = this.workflowDefinition.nodes.find(n => n.id === nodeId);

    let suspendedTask: any; // Declare outside try block

    if (!node || node.type !== SopNodeType.AGENT || node.agent_type !== AgentType.HUMAN_INTERACTION) {
      console.error(`Attempted to resume a non-human or non-existent node: ${nodeId}`);
      return { context: currentContext, status: 'FAILED' };
    }

    let newContext = { ...currentContext };
    let executionStatus: 'RUNNING' | 'COMPLETED' | 'FAILED' = 'RUNNING';

    try {
      // Find the suspended SopTask
      const suspendedTask = await prisma.sopTask.findFirst({
        where: {
          executionId: this.executionId,
          nodeId: nodeId,
          status: 'WAITING_FOR_HUMAN',
        },
        orderBy: { createdAt: 'desc' }, // Get the latest suspended task
      });

      if (!suspendedTask) {
        console.error(`No suspended human task found for node ${nodeId} in execution ${this.executionId}`);
        return { context: currentContext, status: 'FAILED' };
      }

      // Apply invisible middleware processing to humanInput here
      // For now, just pass it through
      const processedInput = humanInput; // TODO: Implement actual middleware

      // Store the human input as the output of the human task
      newContext.tasks[nodeId] = { output: processedInput };

      // Mark the SopTask as completed
      await prisma.sopTask.update({
        where: { id: suspendedTask.id },
        data: {
          status: 'COMPLETED',
          output: processedInput as any,
        },
      });

      // Now, find the next node and continue execution
      const nextNodeId = this.findNextNode(nodeId, newContext);
      if (nextNodeId) {
        const result = await this.executeStep(nextNodeId, newContext);
        return { context: result.context, status: result.status };
      } else {
        executionStatus = 'COMPLETED'; // Workflow completed after human input
      }

      return { context: newContext, status: executionStatus };

    } catch (error) {
      console.error(`Error resuming human node ${nodeId}:`, error);
      // Mark the task as failed if an error occurs during resume
      if (suspendedTask?.id) { // Check if suspendedTask exists before trying to update
        await prisma.sopTask.update({
          where: { id: suspendedTask.id },
          data: { status: 'FAILED', output: { error: String(error) } as any },
        });
      }
      return { context: currentContext, status: 'FAILED' };
    }
  } // Added missing closing brace for the class

  /**
   * Finds the next node to execute based on the current node's type and output.
   * This is a simplified logic and will need to be expanded for complex routing.
   * @param currentNodeId The ID of the currently executed node.
   * @param context The current execution context.
   * @returns The ID of the next node, or null if the workflow ends.
   */
  private findNextNode(currentNodeId: string, context: ExecutionContext): string | null {
    const outgoingEdges = this.workflowDefinition.edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length === 0) {
      return null; // End of workflow
    }

    // For REASONING nodes, we would typically have conditional edges
    const currentNode = this.workflowDefinition.nodes.find(n => n.id === currentNodeId);
    if (currentNode?.type === SopNodeType.REASONING) {
      // Assuming ReasoningNodeSchema has a 'routes' property
      const reasoningNode = currentNode as any; // Cast to any for now, proper type guarding needed
      const decision = context.tasks[currentNodeId]?.output?.decision;
      if (decision && reasoningNode.routes && reasoningNode.routes[decision]) {
        return reasoningNode.routes[decision];
      }
    }

    // If there's only one outgoing edge or no specific routing logic for the node type, take the first one
    if (outgoingEdges.length > 0) {
      // Prioritize edges without conditions if multiple exist and no specific logic applies
      const unconditionalEdge = outgoingEdges.find(edge => !edge.condition);
      if (unconditionalEdge) {
        return unconditionalEdge.target;
      }
      // Otherwise, just take the first one (could be arbitrary if multiple conditional edges exist without a match)
      return outgoingEdges[0].target;
    }

    return null; // No next node found
  }
}