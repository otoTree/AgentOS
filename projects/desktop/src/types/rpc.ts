export type ChatRequest = {
  message: string;
};

export type ChatResponse = {
  content: string;
};

export interface RPCMessage {
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
