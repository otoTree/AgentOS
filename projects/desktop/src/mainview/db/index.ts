import Dexie, { Table } from 'dexie';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status: 'sending' | 'sent' | 'error';
}

export class ChatDatabase extends Dexie {
  sessions!: Table<ChatSession>;
  messages!: Table<ChatMessage>;

  constructor() {
    super('AgentOSDesktopDB');
    this.version(1).stores({
      sessions: 'id, title, createdAt, updatedAt', // Primary key and indexed props
      messages: 'id, sessionId, createdAt, role'
    });
  }
}

export const db = new ChatDatabase();
