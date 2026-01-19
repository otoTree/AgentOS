import { SuperAgent } from "@agentos/agent";
import { DesktopLLMClient } from "./llm";
import { localDB } from "../db";
import { BrowserWindow } from "electrobun/bun";
import { fileTools } from "../tools/file";

export class AgentService {
  private agent: SuperAgent;
  
  constructor(private llmClient: DesktopLLMClient) {
    this.agent = new SuperAgent({
      model: "gpt-3.5-turbo",
      llmClient: this.llmClient,
      tools: [...fileTools] as any, // 添加本地工具 (强制类型转换)
      prompts: {
        system: "You are a helpful assistant running on AgentOS Desktop. You have access to the local file system.",
      }
    });
  }

  async chat(message: string, sessionId: string, webviewId: number) {
    // 1. 保存用户消息到本地 DB
    const userMsgId = crypto.randomUUID();
    localDB.addMessage({
      id: userMsgId,
      role: "user",
      content: message,
      session_id: sessionId
    });

    // 2. 调用 Agent
    // 注意：Agent 内部维护了 history，但这里我们需要手动管理 history 
    // 或者让 Agent 每次都从 DB 加载 history？
    // 简单起见，我们暂时不从 DB 加载完整历史传给 Agent (context window 限制)，
    // 而是依赖 SuperAgent 内部的 context (如果是长连接/单实例)。
    // 但 AgentService可能是单例，SuperAgent 是有状态的。
    // 如果支持多 Session，需要管理多个 SuperAgent 实例或每次重建。
    
    // 这里为了简单，我们假设 AgentService 每次请求都重建 Agent 或者 reset context
    // 实际上应该维护 Session -> Agent 实例的映射
    
    // 3. 执行 Agent
    try {
       const response = await this.agent.run(message);
       
       // 4. 保存 Assistant 消息
       const aiMsgId = crypto.randomUUID();
       localDB.addMessage({
         id: aiMsgId,
         role: "assistant",
         content: response,
         session_id: sessionId
       });

       return response;
    } catch (error) {
      console.error("Agent execution failed:", error);
      throw error;
    }
  }
}
