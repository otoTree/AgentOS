import { Skill } from "@agentos/agent";

export type ChatRequest = {
  message: string;
  sessionId: string;
};

export type ChatResponse = {
  content: string;
  toolCalls?: { name: string; args: string; status: 'running' | 'done'; result?: string }[];
};

export type RPCMessage = {
  id: string;
  role: string;
  content: string;
  created_at: number;
}

export type GetHistoryRequest = {
  sessionId?: string;
};

export type GetHistoryResponse = {
  messages: RPCMessage[];
};

export type SetTokenRequest = {
  token: string;
};

export type SetTokenResponse = {
  success: boolean;
};

export type RunScriptRequest = {
  code: string;
  language: string;
};

export type RunScriptResponse = {
  output: string;
  error: string;
};

// Skill RPC Types
export type GenerateSkillRequest = {
  prompt: string;
};

export type GenerateSkillResponse = {
  success: boolean;
  skillName?: string;
  error?: string;
};

export type ListSkillsRequest = {};

export type ListSkillsResponse = {
  skills: Skill[];
};

export type PublishSkillRequest = {
  skillName: string;
};

export type PublishSkillResponse = {
  success: boolean;
  skillId?: string;
  error?: string;
};

export type AgentRPCSchema = {
  bun: {
    requests: {
      chat: {
        params: ChatRequest;
        returns: ChatResponse;
      };
      getHistory: {
        params: GetHistoryRequest;
        returns: GetHistoryResponse;
      };
      setToken: {
        params: SetTokenRequest;
        returns: SetTokenResponse;
      };
      runScript: {
        params: RunScriptRequest;
        returns: RunScriptResponse;
      };
      // Skill RPCs
      generateSkill: {
        params: GenerateSkillRequest;
        returns: GenerateSkillResponse;
      };
      listSkills: {
        params: ListSkillsRequest;
        returns: ListSkillsResponse;
      };
      publishSkill: {
        params: PublishSkillRequest;
        returns: PublishSkillResponse;
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      chunk: { content: string };
      tool_start: { name: string; args: any };
      tool_end: { name: string; output: any };
    };
  };
};
