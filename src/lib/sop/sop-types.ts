import { z } from 'zod';

// 1. Core Node Types
export enum SopNodeType {
  INTERACT = 'INTERACT',
  REASONING = 'REASONING',
  ACTION = 'ACTION',
  AGENT = 'AGENT',
}

export enum AgentType {
  SUB_SOP = 'SUB_SOP',
  HUMAN_INTERACTION = 'HUMAN_INTERACTION',
  LLM_AGENT = 'LLM_AGENT', // For future LLM-based agents
}

// 2. Meta-Language Schema: Node Definitions
// Base Node Schema
const BaseNodeSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.nativeEnum(SopNodeType),
  // Common input/output schema for all nodes
  input_schema: z.record(z.string(), z.any()).optional(), // Zod schema for input validation
  output_schema: z.record(z.string(), z.any()).optional(), // Zod schema for output validation
});

// INTERACT Node: LLM with user conversation
export const InteractNodeSchema = BaseNodeSchema.extend({
  type: z.literal(SopNodeType.INTERACT),
  prompt: z.string(),
  // Add specific fields for INTERACT node like LLM configuration, etc.
});

// REASONING Node: Pure logic with routing rules
export const ReasoningNodeSchema = BaseNodeSchema.extend({
  type: z.literal(SopNodeType.REASONING),
  logic_script: z.string(), // e.g., JavaScript or a DSL for switch-case
  routes: z.record(z.string(), z.string()), // { "case_value": "next_node_id" }
});

// ACTION Node: Call API, DB, or code block
export const ActionNodeSchema = BaseNodeSchema.extend({
  type: z.literal(SopNodeType.ACTION),
  action_type: z.string(), // e.g., 'API_CALL', 'DB_QUERY', 'CODE_BLOCK'
  config: z.record(z.string(), z.any()), // Configuration for the action (e.g., API endpoint, query)
});

// AGENT Node: Sub-SOP or Human
// Human Interaction Specific Schemas
export const HumanContextWidgetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('markdown'), content: z.string() }),
  z.object({ type: z.literal('file_preview'), url: z.string() }),
  // Add other widget types as needed
]);

export const HumanInputFormSchema = z.discriminatedUnion('type', [
  z.object({ key: z.string(), type: z.literal('text'), label: z.string().optional(), defaultValue: z.string().optional() }),
  z.object({ key: z.string(), type: z.literal('radio'), label: z.string().optional(), options: z.array(z.string()) }),
  // Add other form field types
]);

export const HumanInteractionConfigSchema = z.object({
  context_view: z.object({
    title: z.string().optional(),
    widgets: z.array(HumanContextWidgetSchema).optional(),
  }).optional(),
  input_config: z.object({
    allow_audio: z.boolean().optional(),
    allow_files: z.boolean().optional(),
    file_types: z.array(z.string()).optional(), // e.g., [".pdf", ".img"]
    form_schema: z.array(HumanInputFormSchema).optional(),
  }).optional(),
  output_schema: z.record(z.string(), z.string()).optional(), // e.g., { instruction: "string", attachments: "array", decision: "string" }
});

export const AgentNodeSchema = BaseNodeSchema.extend({
  type: z.literal(SopNodeType.AGENT),
  agent_type: z.nativeEnum(AgentType),
  // Configuration specific to the agent type
  config: z.union([
    z.object({ sub_sop_id: z.string() }), // For SUB_SOP
    HumanInteractionConfigSchema, // For HUMAN_INTERACTION
    z.object({ llm_config: z.record(z.string(), z.any()) }), // For LLM_AGENT
  ]),
});

// Union of all possible TaskNode types
export const TaskNodeSchema = z.discriminatedUnion('type', [
  InteractNodeSchema,
  ReasoningNodeSchema,
  ActionNodeSchema,
  AgentNodeSchema,
]);

export type TaskNode = z.infer<typeof TaskNodeSchema>;

// 3. Workflow Definition (Graph Structure)
export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(TaskNodeSchema),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    // Add conditions for conditional edges if needed
    condition: z.string().optional(), // e.g., "output.decision == 'PASS'"
  })),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

// 4. Execution Context (Blackboard Pattern)
export const ExecutionContextSchema = z.object({
  global: z.record(z.string(), z.any()).default({}), // Global variables (userId, orderId)
  tasks: z.record(z.string(), z.object({
    output: z.record(z.string(), z.any()).optional(), // Task outputs (Key=TaskId)
    // Potentially add other task-specific data here if needed
  })).default({}),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    timestamp: z.string(), // ISO date string
  })).default([]), // Chat history
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

// 5. Human Task Configuration (for runtime)
export type HumanTaskConfig = z.infer<typeof HumanInteractionConfigSchema>;

// Utility type for Prisma JSON fields
export type PrismaJson = Record<string, any>;