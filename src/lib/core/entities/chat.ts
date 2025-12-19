import { BaseEntity } from '@/lib/core/db/redis-repository';

export interface AgentConversation extends BaseEntity {
  title: string;
  userId: string;
  browserSessionId?: string;
  browserUrl?: string;
  browserScreenshot?: string;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  // tool_calls and tool_outputs could be added here later
}

export interface ConversationTool {
  conversationId: string;
  toolId: string;
}

export interface ConversationFile {
  conversationId: string;
  fileId: string;
}
