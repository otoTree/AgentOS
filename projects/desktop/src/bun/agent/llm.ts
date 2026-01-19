import { LLMClient, LLMResponse } from "@agentos/agent/src/core/types";
import { ApiClient, ChatCompletionRequest, ChatMessage, ChatTool } from "../api";

export class DesktopLLMClient implements LLMClient {
  constructor(private apiClient: ApiClient) {}

  async chat(messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[], tools?: any[]): Promise<LLMResponse> {
    try {
      // Convert messages to ApiClient format
      const apiMessages: ChatMessage[] = messages.map(m => ({
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }));

      // Assume tools are already in OpenAI format if provided (as per SuperAgent implementation)
      const apiTools: ChatTool[] | undefined = tools as ChatTool[] | undefined;

      const chatReq: ChatCompletionRequest = {
        // model is optional and determined by the server configuration
        messages: apiMessages,
        tools: apiTools
      };

      const res = await this.apiClient.chat(chatReq);
      
      const choice = res.choices[0];
      const message = choice.message;

      // Parse tool calls arguments from string to object
      const toolCalls = message.tool_calls?.map(tc => {
          let args = {};
          try {
              args = JSON.parse(tc.function.arguments);
          } catch (e) {
              console.error("Failed to parse tool arguments:", tc.function.arguments);
          }
          return {
              id: tc.id,
              name: tc.function.name,
              arguments: args
          };
      });

      return {
        content: message.content || "",
        toolCalls: toolCalls
      };
    } catch (error) {
      console.error("DesktopLLMClient error:", error);
      throw error;
    }
  }
}
