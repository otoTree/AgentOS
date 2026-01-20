import { z } from 'zod';

// --- Prompt ---
export type PromptTemplate = {
  template: string;
  variables: string[];
  format(values: Record<string, any>): string;
}

export type PromptConfig = {
  system?: string;
  user?: string;
  // 可以扩展支持 few-shot examples 等
}

// --- Tool ---
export type Tool<T extends z.ZodType = any> = {
  name: string;
  description: string;
  parameters: T;
  jsonSchema?: any; // Optional: Direct JSON schema to bypass Zod conversion
  execute(args: z.infer<T>): Promise<any>;
}

// --- Action ---
export type ActionType = 'thought' | 'tool_call' | 'tool_result' | 'answer' | 'error';

export type AgentAction = {
  type: ActionType;
  content: string; // 思考内容或最终回答
  toolName?: string;
  toolArgs?: any;
  toolOutput?: any;
  timestamp: number;
}

// --- Agent Context ---
export type AgentContext = {
  history: AgentAction[];
  variables: Record<string, any>;
}

// --- Agent Config ---
export type AgentConfig = {
  name?: string;
  model: string; // 模型标识符
  temperature?: number;
  maxTokens?: number;
  prompts: PromptConfig;
  tools?: Tool[];
  llmClient?: LLMClient;
  toolCallMethod?: 'native' | 'json_prompt' | 'xml_prompt'; // 新增：工具调用方式
  history?: { role: string; content: string }[]; // Optional: Previous chat history
  callbacks?: AgentCallbacks;
  maxTurns?: number;
}

export type AgentCallbacks = {
  onToolStart?: (toolName: string, args: any) => void;
  onToolEnd?: (toolName: string, output: any) => void;
  onStep?: (step: AgentAction) => void;
}

// --- LLM Client Interface ---
export type LLMResponse = {
  content: string;
  toolCalls?: { id?: string; name: string; arguments: any }[];
}

export type LLMClient = {
  chat(messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[], tools?: any[]): Promise<LLMResponse>;
}
