import { LLMClient, LLMResponse } from "@agentos/agent/src/core/types";
import { ApiClient, ChatCompletionRequest, ChatMessage, ChatTool } from "../api";

export class DesktopLLMClient implements LLMClient {
  constructor(private apiClient: ApiClient) {}

  async chat(messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[], tools?: any[]): Promise<LLMResponse> {
    try {
      // Convert messages to ApiClient format
      const apiMessages: ChatMessage[] = messages.map(m => ({
        role: m.role as "user" | "assistant" | "system" | "tool",
        content: m.content ?? "", // Ensure content field is always present (default to empty string if null/undefined)
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
      
      if (!res.choices || res.choices.length === 0) {
          throw new Error("LLM returned no choices");
      }
      
      const choice = res.choices[0];
      const message = choice.message;

      if (!message) {
          throw new Error("LLM returned no message");
      }

      // Parse tool calls arguments from string to object
      const toolCalls = message.tool_calls?.map((tc: any) => {
          // If the server already parsed it (it has name/arguments directly)
          if (tc.name && tc.arguments && typeof tc.arguments === 'object') {
              return {
                  id: tc.id,
                  name: tc.name,
                  arguments: tc.arguments
              };
          }

          // Fallback to standard OpenAI format
          if (!tc.function) {
              console.warn("Tool call missing function data:", tc);
              return {
                  id: tc.id,
                  name: "unknown",
                  arguments: {}
              };
          }
          let args = {};
          try {
              args = typeof tc.function.arguments === 'string' 
                ? JSON.parse(tc.function.arguments) 
                : tc.function.arguments;
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
