import OpenAI from 'openai';
import { WorkflowDefinition, WorkflowDefinitionSchema } from '@/lib/sop/sop-types';
import { systemConfig } from '@/lib/infra/config';

// System prompt for generating a new SOP from text
const SOP_GENERATOR_SYSTEM_PROMPT = `
# Role
SOP Workflow Architect

# Objective
You are an expert in designing Standard Operating Procedures (SOPs). Your task is to convert a user's natural language description or document text into a structured JSON Workflow Definition.

# Output Format
You must return a valid JSON object adhering to the following structure (WorkflowDefinition):
{
  "nodes": [
    {
      "id": "unique_node_id",
      "type": "INTERACT" | "REASONING" | "ACTION" | "AGENT",
      "name": "Step Name",
      "description": "Step Description",
      // ... specific fields based on type
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "source_node_id",
      "target": "target_node_id",
      "condition": "optional_condition_string" 
    }
  ]
}

# Node Types Guide
1. **INTERACT**: Use when the system needs to ask the user for information via chat (LLM).
   - Fields: prompt (string)
2. **REASONING**: Use for logical branching.
   - Fields: logic_script (string), routes ({ "case": "target_node_id" })
3. **ACTION**: Use for executing code or API calls.
   - Fields: action_type (string), config (object)
4. **AGENT**: Use for HUMAN interaction or Sub-SOPs.
   - For Human tasks (approvals, file uploads), use type="AGENT", agent_type="HUMAN_INTERACTION".
   - Fields: 
     - config: {
         context_view: { title, widgets: [] },
         input_config: { allow_audio, allow_files, form_schema: [] },
         output_schema: {}
       }

# Rules
1. Ensure all node IDs are unique.
2. Ensure the graph is connected (edges link nodes logically).
3. For "Human Interaction" (e.g., approval, review), ALWAYS use the AGENT node with agent_type="HUMAN_INTERACTION".
4. Return ONLY the JSON object.
`;

// System prompt for modifying an existing SOP
const SOP_MODIFIER_SYSTEM_PROMPT = `
# Role
SOP Workflow Copilot

# Objective
You are an intelligent assistant helping a user modify an existing SOP workflow. You will receive the current Workflow Definition (JSON) and a user command. Your task is to return the *updated* Workflow Definition.

# Constraints
1. Preserve existing node IDs unless they are being deleted.
2. Ensure the graph remains valid (no broken edges).
3. Understand vague commands like "Add an approval step before the end" and translate them into graph changes.
4. Return ONLY the updated JSON object.
`;

export async function generateSopFromText(
  description: string
): Promise<WorkflowDefinition> {
  const apiKey = systemConfig.openai.apiKey;
  const baseUrl = systemConfig.openai.baseUrl;
  const model = systemConfig.openai.model || "gpt-4o";

  if (!apiKey) {
    throw new Error("OpenAI API Key is not configured.");
  }

  const openai = new OpenAI({
    baseURL: baseUrl || undefined,
    apiKey: apiKey,
  });

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SOP_GENERATOR_SYSTEM_PROMPT },
        { role: "user", content: `Create an SOP workflow for the following process:\n\n${description}` }
      ],
      model: model,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message.content || "{}";
    const result = JSON.parse(content);
    
    // Validate against schema (optional but recommended)
    // return WorkflowDefinitionSchema.parse(result); 
    return result as WorkflowDefinition;

  } catch (error) {
    console.error("SOP Generation failed:", error);
    throw new Error("Failed to generate SOP from text");
  }
}

export async function modifySopWithChat(
  currentWorkflow: WorkflowDefinition,
  userCommand: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<WorkflowDefinition> {
  const apiKey = systemConfig.openai.apiKey;
  const baseUrl = systemConfig.openai.baseUrl;
  const model = systemConfig.openai.model || "gpt-4o";

  if (!apiKey) {
    throw new Error("OpenAI API Key is not configured.");
  }

  const openai = new OpenAI({
    baseURL: baseUrl || undefined,
    apiKey: apiKey,
  });

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SOP_MODIFIER_SYSTEM_PROMPT },
        { role: "user", content: `Current Workflow JSON:\n${JSON.stringify(currentWorkflow, null, 2)}` },
        ...chatHistory,
        { role: "user", content: `Modification Request: ${userCommand}` }
      ],
      model: model,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message.content || "{}";
    const result = JSON.parse(content);
    
    return result as WorkflowDefinition;

  } catch (error) {
    console.error("SOP Modification failed:", error);
    throw new Error("Failed to modify SOP");
  }
}