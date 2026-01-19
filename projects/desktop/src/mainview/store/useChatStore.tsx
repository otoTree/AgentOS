import { create } from 'zustand';
import { Message } from '../types';
import React from 'react';
import { rpc } from '../rpc';

interface ChatState {
  messages: Message[];
  chatInput: string;
  isTyping: boolean;
  setChatInput: (input: string) => void;
  sendMessage: () => void;
  fetchHistory: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  chatInput: '',
  isTyping: false,
  setChatInput: (input) => set({ chatInput: input }),
  fetchHistory: async () => {
      try {
          const response = await rpc.request.getHistory({}) as any;
          const { messages } = response;
          const formattedMessages: Message[] = messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          set({ messages: formattedMessages });
      } catch (error) {
          console.error('Failed to fetch history:', error);
      }
  },
  sendMessage: async () => {
    const { chatInput } = get();
    if (!chatInput.trim()) return;

    const userInput = chatInput;
    
    // Optimistic update
    const tempId = Date.now().toString();
    const newMsg: Message = {
      id: tempId,
      role: 'user',
      content: userInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    set((state) => ({
      messages: [...state.messages, newMsg],
      chatInput: '',
      isTyping: true
    }));

    try {
      const response = await rpc.request.chat({ message: userInput }) as any;
      
      set((state) => ({
        isTyping: false,
        messages: [...state.messages, {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]
      }));
    } catch (error) {
      console.error('Failed to send message:', error);
      set((state) => ({
        isTyping: false,
        messages: [...state.messages, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]
      }));
    }
  }
}));
