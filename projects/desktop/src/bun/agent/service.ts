import { SuperAgent } from "@agentos/agent";
import { DesktopLLMClient } from "./llm";
import { localDB } from "../db";
import { BrowserWindow } from "electrobun/bun";
import { fileTools } from "../tools/file";
import * as os from 'node:os';

export class AgentService {
  private agents: Map<string, SuperAgent> = new Map();
  private extraTools: any[];
  
  constructor(private llmClient: DesktopLLMClient, extraTools: any[] = []) {
    this.extraTools = extraTools;
  }

  private getOrCreateAgent(sessionId: string): SuperAgent {
    if (this.agents.has(sessionId)) {
      return this.agents.get(sessionId)!;
    }

    const homeDir = os.homedir();
    const platform = os.platform();

    const agent = new SuperAgent({
      model: "gpt-3.5-turbo",
      llmClient: this.llmClient,
      maxTurns: 50,
      tools: [...fileTools, ...this.extraTools] as any, // 添加本地工具 (强制类型转换)
      prompts: {
        system: `You are a helpful assistant running on AgentOS Desktop. 
You have access to the local file system.
The current user's home directory is: ${homeDir}
The operating system is: ${platform}
When using tools that require paths, you should prefer using paths relative to the home directory or absolute paths that are correct for this OS.
Example: If the user asks for files on Desktop, use "${homeDir}/Desktop".`,
      }
    });

    this.agents.set(sessionId, agent);
    return agent;
  }

  async chat(message: string, sessionId: string, webviewId: number, onEvent?: (type: string, data: any) => void) {
    // 1. 保存用户消息到本地 DB
    const userMsgId = crypto.randomUUID();
    localDB.addMessage({
      id: userMsgId,
      role: "user",
      content: message,
      session_id: sessionId
    });

    // 2. 获取或创建 Agent
    const agent = this.getOrCreateAgent(sessionId);
    
    // 3. 执行 Agent
    try {
       console.log("[AgentService] Starting agent run with message:", message, "Session:", sessionId);
       
       const toolCalls: { name: string; args: string; status: 'running' | 'done'; result?: string }[] = [];

       // 设置回调来保存中间过程
       agent.setCallbacks({
         onToolStart: (toolName, args) => {
           console.log(`[AgentService] 🛠️ Executing tool: ${toolName}`, args);
           
           if (onEvent) {
             onEvent('tool_start', { name: toolName, args });
           }

           toolCalls.push({
             name: toolName,
             args: JSON.stringify(args),
             status: 'running'
           });

           // 保存一个带 tool_calls 的 assistant 消息
           localDB.addMessage({
             id: crypto.randomUUID(),
             role: "assistant",
             content: "",
             session_id: sessionId,
             metadata: {
               tool_calls: [{
                 id: `call_${Date.now()}`, 
                 type: "function",
                 function: { name: toolName, arguments: JSON.stringify(args) }
               }]
             }
           });
         },
         onToolEnd: (toolName, output) => {
           // 如果 output 是 undefined，可能是在 onStep 中处理了错误
           if (output === undefined) return;

           console.log(`[AgentService] ✅ Tool finished: ${toolName}, result:`, 
             typeof output === 'string' && output.length > 500 ? output.substring(0, 500) + '...' : output
           );

           // Callback: Tool End
           if (onEvent) {
               onEvent('tool_end', { name: toolName, output });
           }

           // Update local toolCalls
           for (let i = toolCalls.length - 1; i >= 0; i--) {
             if (toolCalls[i].name === toolName && toolCalls[i].status === 'running') {
               toolCalls[i].status = 'done';
               toolCalls[i].result = JSON.stringify(output);
               break;
             }
           }

           // 保存 tool 结果消息
           localDB.addMessage({
             id: crypto.randomUUID(),
             role: "tool",
             content: JSON.stringify(output),
             session_id: sessionId,
             metadata: {
               tool_name: toolName
             }
           });
         },
         onStep: (step) => {
            if (step.type === 'error') {
                console.error(`[AgentService] ❌ Tool error:`, step.content);
                localDB.addMessage({
                    id: crypto.randomUUID(),
                    role: "tool",
                    content: step.content,
                    session_id: sessionId,
                    metadata: {
                        error: true,
                        tool_name: step.toolName
                    }
                });
            }
         }
       });

       const response = await agent.run(message);
       console.log("[AgentService] Agent run finished, response length:", response?.length);
       
       // 4. 保存 Assistant 消息
       const aiMsgId = crypto.randomUUID();
       localDB.addMessage({
         id: aiMsgId,
         role: "assistant",
         content: response,
         session_id: sessionId
       });

       return { content: response, toolCalls };
    } catch (error) {
      console.error("Agent execution failed:", error);
      throw error;
    }
  }
}
