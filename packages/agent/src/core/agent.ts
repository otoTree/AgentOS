import { AgentConfig, AgentContext, AgentAction, LLMClient, LLMResponse, AgentCallbacks } from './types';
import { SimplePromptTemplate } from '../prompt/template';
import { ToolRegistry } from '../tool/registry';
import { ActionExecutor } from '../action/executor';

const JSON_TOOL_PROMPT = `
You have access to the following tools:
{{tool_descriptions}}

To use a tool, please output a JSON object with the following format:
\`\`\`json
{
  "tool": "tool_name",
  "arguments": {
    "arg_name": "value"
  }
}
\`\`\`
`;

const XML_TOOL_PROMPT = `
You have access to the following tools:
{{tool_descriptions}}

To use a tool, please output an XML block with the following format:
<tool_code>
  <tool_name>tool_name</tool_name>
  <parameters>
    <arg_name>value</arg_name>
  </parameters>
</tool_code>
`;

export class SuperAgent {
  private config: AgentConfig;
  private context: AgentContext;
  private toolRegistry: ToolRegistry;
  private actionExecutor: ActionExecutor;
  private llmClient: LLMClient;

  constructor(config: AgentConfig) {
    this.config = config;
    this.context = {
      history: [],
      variables: {}
    };
    this.toolRegistry = new ToolRegistry(config.tools || []);
    this.actionExecutor = new ActionExecutor(this.toolRegistry);
    
    if (!config.llmClient) {
        throw new Error("LLM Client is required");
    }
    this.llmClient = config.llmClient;
  }

  // 设置上下文变量
  setVariables(variables: Record<string, any>) {
    this.context.variables = { ...this.context.variables, ...variables };
  }

  setCallbacks(callbacks: AgentCallbacks) {
    this.config.callbacks = callbacks;
  }

  getContext() {
    return this.context;
  }

  // 运行 Agent
  async run(input: string): Promise<string> {
    // 1. 构造初始消息
    const messages = await this.buildMessages(input);
    const toolMethod = this.config.toolCallMethod || 'native';
    
    // 2. 循环执行 (Thought -> Action -> Observation)
    let turns = 0;
    const maxTurns = this.config.maxTurns || 10; // 防止无限循环

    while (turns < maxTurns) {
      turns++;

      // 调用 LLM
      // 只有 native 模式下才传递 tools 给 LLM
      const tools = toolMethod === 'native' ? this.toolRegistry.getOpenAITools() : undefined;
      const response = await this.llmClient.chat(messages, tools);
      
      // 3. 解析工具调用
      let toolCalls: { id?: string; name: string; arguments: any }[] = [];

      if (toolMethod === 'native') {
        toolCalls = response.toolCalls || [];
      } else {
        // Prompt 模式下，从 content 中解析
        toolCalls = this.parseToolCallsFromText(response.content, toolMethod);
      }
      
      // 4. 执行工具或返回结果
      if (toolCalls.length > 0) {
         // 添加 Assistant 消息
         if (toolMethod === 'native') {
             messages.push({
                 role: 'assistant',
                 content: response.content || null,
                 tool_calls: toolCalls.map(tc => ({
                     id: tc.id,
                     type: 'function',
                     function: {
                         name: tc.name,
                         arguments: JSON.stringify(tc.arguments)
                     }
                 }))
             });
         } else {
             messages.push({ role: 'assistant', content: response.content || '' });
         }

         // 处理工具调用
         for (const toolCall of toolCalls) {
             const action: AgentAction = {
                 type: 'tool_call',
                 content: response.content || '', // 保留思考过程
                 toolName: toolCall.name,
                 toolArgs: toolCall.arguments,
                 timestamp: Date.now()
             };
             
             this.context.history.push(action);

             // Callback: Tool Start
             if (this.config.callbacks?.onToolStart) {
                 this.config.callbacks.onToolStart(toolCall.name, toolCall.arguments);
             }
             if (this.config.callbacks?.onStep) {
                 this.config.callbacks.onStep(action);
             }

             // 执行工具
             const resultAction = await this.actionExecutor.execute(action);
             this.context.history.push(resultAction);
             
             // Callback: Tool End
             if (this.config.callbacks?.onToolEnd) {
                 this.config.callbacks.onToolEnd(toolCall.name, resultAction.toolOutput);
             }
             if (this.config.callbacks?.onStep) {
                 this.config.callbacks.onStep(resultAction);
             }
             
             // 将结果反馈给 LLM
             if (toolMethod === 'native') {
                 messages.push({ 
                     role: 'tool', 
                     tool_call_id: toolCall.id,
                     content: JSON.stringify(resultAction.toolOutput) 
                 });
             } else {
                 messages.push({ 
                     role: 'user', 
                     content: `Tool Output (${toolCall.name}): ${JSON.stringify(resultAction.toolOutput)}`
                 });
             }
         }
      } else {
          // 最终回答
          const answerAction: AgentAction = {
              type: 'answer',
              content: response.content,
              timestamp: Date.now()
          };
          this.context.history.push(answerAction);
          return response.content;
      }
    }

    return "Agent execution timed out (max turns reached).";
  }

  private async buildMessages(input: string): Promise<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[]> {
    const messages: { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }[] = [];
    const toolMethod = this.config.toolCallMethod || 'native';
    
    // System Prompt
    let systemPrompt = '';
    if (this.config.prompts.system) {
      const systemTemplate = new SimplePromptTemplate(this.config.prompts.system);
      systemPrompt = systemTemplate.format(this.context.variables);
    }

    // 如果是 Prompt 模式，追加工具说明
    if (toolMethod === 'json_prompt' || toolMethod === 'xml_prompt') {
       const toolDesc = this.toolRegistry.getToolsDescription();
       const templateStr = toolMethod === 'json_prompt' ? JSON_TOOL_PROMPT : XML_TOOL_PROMPT;
       const template = new SimplePromptTemplate(templateStr);
       const toolPrompt = template.format({ tool_descriptions: toolDesc });
       
       systemPrompt += `\n\n${toolPrompt}`;
    }

    if (systemPrompt) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    // Inject History
    if (this.config.history && this.config.history.length > 0) {
        for (const msg of this.config.history) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }
    }

    // User Prompt
    if (this.config.prompts.user) {
      const userTemplate = new SimplePromptTemplate(this.config.prompts.user);
      messages.push({
        role: 'user',
        content: userTemplate.format({ ...this.context.variables, input })
      });
    } else {
        messages.push({
            role: 'user',
            content: input
        });
    }

    return messages;
  }

  private parseToolCallsFromText(content: string, method: 'json_prompt' | 'xml_prompt'): { id?: string; name: string; arguments: any }[] {
      const calls: { name: string; arguments: any }[] = [];
      
      if (method === 'json_prompt') {
          // 匹配 ```json ... ``` 或直接的 JSON 对象
          // 这是一个简化的 regex，实际可能需要更强大的解析
          const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
          let match;
          while ((match = jsonRegex.exec(content)) !== null) {
              try {
                  const jsonStr = match[1];
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.tool && parsed.arguments) {
                      calls.push({
                          name: parsed.tool,
                          arguments: parsed.arguments
                      });
                  }
              } catch (e) {
                  console.warn("Failed to parse JSON tool call", e);
              }
          }
      } else if (method === 'xml_prompt') {
          // 匹配 <tool_code>...</tool_code>
          const xmlRegex = /<tool_code>\s*([\s\S]*?)\s*<\/tool_code>/g;
          let match;
          while ((match = xmlRegex.exec(content)) !== null) {
              const inner = match[1];
              const nameMatch = inner.match(/<tool_name>(.*?)<\/tool_name>/);
              const argsMatch = inner.match(/<parameters>([\s\S]*?)<\/parameters>/);
              
              if (nameMatch) {
                  const name = nameMatch[1].trim();
                  const args: any = {};
                  
                  if (argsMatch) {
                      // 简单的 XML 参数解析：假设参数是扁平的
                      const paramsInner = argsMatch[1];
                      const paramRegex = /<([^>]+)>([\s\S]*?)<\/\1>/g;
                      let pMatch;
                      while ((pMatch = paramRegex.exec(paramsInner)) !== null) {
                          args[pMatch[1]] = pMatch[2].trim();
                      }
                  }
                  
                  calls.push({ name, arguments: args });
              }
          }
      }
      
      return calls;
  }
}
