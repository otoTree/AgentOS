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
