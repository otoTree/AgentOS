import { z } from 'zod';

// --- Prompt ---
export interface PromptTemplate {
  template: string;
  variables: string[];
  format(values: Record<string, any>): string;
}

export interface PromptConfig {
  system?: string;
  user?: string;
  // 可以扩展支持 few-shot examples 等
}

// --- Tool ---
export interface Tool<T extends z.ZodType = any> {
  name: string;
  description: string;
  parameters: T;
  execute(args: z.infer<T>): Promise<any>;
}

// --- Action ---
export type ActionType = 'thought' | 'tool_call' | 'tool_result' | 'answer' | 'error';

export interface AgentAction {
  type: ActionType;
  content: string; // 思考内容或最终回答
  toolName?: string;
  toolArgs?: any;
  toolOutput?: any;
  timestamp: number;
}

// --- Agent Context ---
export interface AgentContext {
  history: AgentAction[];
  variables: Record<string, any>;
}

// --- Agent Config ---
export interface AgentConfig {
  name?: string;
  model: string; // 模型标识符
  temperature?: number;
  maxTokens?: number;
  prompts: PromptConfig;
  tools?: Tool[];
  llmClient?: LLMClient;
  toolCallMethod?: 'native' | 'json_prompt' | 'xml_prompt'; // 新增：工具调用方式
}

// --- LLM Client Interface ---
export interface LLMResponse {
  content: string;
  toolCalls?: { id?: string; name: string; arguments: any }[];
}

export interface LLMClient {
  chat(messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[], tools?: any[]): Promise<LLMResponse>;
}
