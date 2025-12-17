'use server';

import OpenAI from 'openai';
import { systemConfig } from '@/lib/infra/config';
import { SOPSequence } from './sop-types';
import { getToolDefinitions } from '@/app/agent/modules/prompt';

const SOP_SEQUENCE_PROMPT = `
# Role
SOP Architect

# Objective
Convert the user's request into a linear Standard Operating Procedure (SOP).
Return a JSON object with a list of sequential steps.

# Output Format
{
  "title": "SOP Title",
  "description": "Brief description of the process",
  "steps": [
    {
      "id": "step_1",
      "name": "Step Name",
      "description": "What this step does",
      "prompt": "The actual prompt instructions to be executed by an AI Agent for this step.",
      "tool": "optional_tool_name", // e.g., "web_search", "file_reader"
      "dependencies": ["step_0"] // Optional: list of step IDs that this step depends on
    }
  ]
}

# Rules
1. Break complex tasks into logical, sequential steps.
2. The "prompt" field must be self-contained and executable by an AI.
3. If a step requires information from a previous step, mention it in the prompt AND add the previous step's ID to the "dependencies" array.
4. Refer to the "AVAILABLE TOOLS" section below to select the most appropriate tool for each step.
5. **Language Requirement**: Ensure the modified SOP maintains the same language as the original SOP or the user's request language.
`;

export async function generateSopSequence(description: string): Promise<SOPSequence> {
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
    const tools = getToolDefinitions();
    const systemPrompt = SOP_SEQUENCE_PROMPT + "\n\n" + tools;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description }
      ],
      model: model,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    return JSON.parse(content) as SOPSequence;
  } catch (error) {
    console.error("SOP Generation Error:", error);
    throw error;
  }
}

const SOP_MODIFIER_SYSTEM_PROMPT = `
# Role
SOP Architect

# Objective
Modify the existing Standard Operating Procedure (SOP) based on the user's request.
Return the updated SOP as a JSON object.

# Output Format
The output must match the structure of the input SOP:
{
  "title": "SOP Title",
  "description": "Brief description of the process",
  "steps": [
    {
      "id": "step_1",
      "name": "Step Name",
      "description": "What this step does",
      "prompt": "The actual prompt instructions to be executed by an AI Agent for this step.",
      "tool": "optional_tool_name",
      "dependencies": ["step_0"]
    }
  ]
}

# Rules
1. Maintain the integrity of the existing steps unless requested to change.
2. You can add, remove, or modify steps.
3. Ensure the sequence remains logical.
4. The "prompt" field must be self-contained.
5. If a step depends on previous steps, ensure "dependencies" are correctly updated.
6. Refer to the "AVAILABLE TOOLS" section below to select the most appropriate tool for each step.
7. **Language Requirement**: Ensure the modified SOP maintains the same language as the original SOP or the user's request language.
`;

export async function modifySopWithChat(
  currentWorkflow: SOPSequence,
  userCommand: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<SOPSequence> {
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
    const tools = getToolDefinitions();
    const systemPrompt = SOP_MODIFIER_SYSTEM_PROMPT + "\n\n" + tools;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Current Workflow JSON:\n${JSON.stringify(currentWorkflow, null, 2)}` },
        ...chatHistory,
        { role: "user", content: `Modification Request: ${userCommand}` }
      ],
      model: model,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message.content || "{}";
    const result = JSON.parse(content);
    
    return result as SOPSequence;

  } catch (error) {
    console.error("SOP Modification failed:", error);
    throw new Error("Failed to modify SOP");
  }
}