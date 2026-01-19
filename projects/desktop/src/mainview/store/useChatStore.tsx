import { create } from 'zustand';
import { Message } from '../types';
import React from 'react';
import { getRpc } from '../rpc';
import { db, ChatSession } from '../db';
import { v4 as uuidv4 } from 'uuid';

type ChatState = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Message[];
  chatInput: string;
  isTyping: boolean;
  
  // Actions
  setChatInput: (input: string) => void;
  loadSessions: () => Promise<void>;
  createSession: (title?: string) => Promise<string>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateSessionTitle: (id: string, title: string) => Promise<void>;
  
  sendMessage: () => Promise<void>;
  fetchHistory: () => Promise<void>; // Kept for compatibility, but should rely on DB
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  chatInput: '',
  isTyping: false,

  setChatInput: (input) => set({ chatInput: input }),

  loadSessions: async () => {
    try {
      const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray();
      set({ sessions });
      
      // If no active session but sessions exist, select the first one (most recent)
      const { activeSessionId } = get();
      if (!activeSessionId && sessions.length > 0) {
        await get().selectSession(sessions[0].id);
      } else if (!activeSessionId && sessions.length === 0) {
        // Create a default session if none exist
        await get().createSession('New Chat');
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  },

  createSession: async (title = 'New Chat') => {
    const id = uuidv4();
    const now = Date.now();
    const newSession: ChatSession = {
      id,
      title,
      createdAt: now,
      updatedAt: now
    };
    
    await db.sessions.add(newSession);
    await get().loadSessions();
    await get().selectSession(id);
    return id;
  },

  selectSession: async (id: string) => {
    try {
      set({ activeSessionId: id });
      // Load messages for this session
      const dbMessages = await db.messages.where('sessionId').equals(id).sortBy('createdAt');
      
      const formattedMessages: Message[] = dbMessages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      set({ messages: formattedMessages });
    } catch (error) {
      console.error('Failed to select session:', error);
    }
  },

  deleteSession: async (id: string) => {
    try {
      await db.sessions.delete(id);
      await db.messages.where('sessionId').equals(id).delete();
      
      const { activeSessionId } = get();
      if (activeSessionId === id) {
        set({ activeSessionId: null, messages: [] });
      }
      
      await get().loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  updateSessionTitle: async (id: string, title: string) => {
    try {
      await db.sessions.update(id, { title, updatedAt: Date.now() });
      await get().loadSessions();
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  },

  fetchHistory: async () => {
    // This is now handled by selectSession loading from DB
    // But if we want to sync from backend, we could call RPC here
    // For now, we rely on local DB as the source of truth for UI
    const { activeSessionId } = get();
    if (activeSessionId) {
      await get().selectSession(activeSessionId);
    }
  },

  sendMessage: async () => {
    const { chatInput, activeSessionId } = get();
    if (!chatInput.trim()) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = await get().createSession(chatInput.slice(0, 30) || 'New Chat');
    }

    const userInput = chatInput;
    const now = Date.now();
    const userMsgId = uuidv4();

    // 1. Save user message to DB
    await db.messages.add({
      id: userMsgId,
      sessionId: currentSessionId!,
      role: 'user',
      content: userInput,
      createdAt: now,
      status: 'sending'
    });

    // 2. Update Session timestamp and maybe title
    const session = await db.sessions.get(currentSessionId!);
    if (session) {
      const updates: Partial<ChatSession> = { updatedAt: now };
      if (session.title === 'New Chat') {
        updates.title = userInput.slice(0, 30);
      }
      await db.sessions.update(currentSessionId!, updates);
    }
    
    // Refresh UI
    await get().loadSessions(); // To update title/order
    await get().selectSession(currentSessionId!); // To show new message

    set({ chatInput: '', isTyping: true });

    try {
      const rpc = await getRpc();
      // Pass sessionId to RPC
      const response = await rpc.request.chat({ 
        message: userInput,
        sessionId: currentSessionId!
      }) as any;
      
      // 3. Save assistant message to DB
      const assistantMsgId = uuidv4();
      await db.messages.add({
        id: assistantMsgId,
        sessionId: currentSessionId!,
        role: 'assistant',
        content: response.content,
        createdAt: Date.now(),
        status: 'sent'
      });

      // Update UI
      set({ isTyping: false });
      await get().selectSession(currentSessionId!);

    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      // Save error message
      const errorMsgId = uuidv4();
      await db.messages.add({
        id: errorMsgId,
        sessionId: currentSessionId!,
        role: 'assistant',
        content: `Error: ${error.message || JSON.stringify(error)}`,
        createdAt: Date.now(),
        status: 'error'
      });
      
      set({ isTyping: false });
      await get().selectSession(currentSessionId!);
    }
  }
}));
