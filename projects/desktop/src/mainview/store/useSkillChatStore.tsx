import { create } from 'zustand';
import { Message } from '../types';
import { getRpc } from '../rpc';
import { v4 as uuidv4 } from 'uuid';
import { ChatResponse } from '../../types/rpc';

type SkillChatState = {
  messages: Message[];
  chatInput: string;
  isTyping: boolean;
  sessionId: string | null;
  
  setChatInput: (input: string) => void;
  initializeSession: (skillName: string) => void;
  sendMessage: () => Promise<void>;
  
  handleToolStart: (name: string, args: any) => void;
  handleToolEnd: (name: string, output: any) => void;
}

export const useSkillChatStore = create<SkillChatState>((set, get) => ({
  messages: [],
  chatInput: '',
  isTyping: false,
  sessionId: null,

  setChatInput: (input) => set({ chatInput: input }),

  initializeSession: (skillName) => {
    // Generate a unique session ID for this skill session
    // We use a deterministic ID to match the backend's event stream
    const sessionId = `skill-${skillName}`;
    const { sessionId: currentSessionId } = get();
    
    // Only reset if changing sessions
    if (currentSessionId !== sessionId) {
        set({ sessionId, messages: [] });
    }
  },

  sendMessage: async () => {
    const { chatInput, sessionId } = get();
    if (!chatInput.trim() || !sessionId) return;

    const userInput = chatInput;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = uuidv4();

    // Add user message to UI
    const newMessages = [...get().messages, {
        id: userMsgId,
        role: 'user',
        content: userInput,
        time: now
    } as Message];
    
    set({ messages: newMessages, chatInput: '', isTyping: true });

    try {
      const rpc = await getRpc();
      // Send message to backend
      const response = await rpc.request.chat({ 
        message: userInput,
        sessionId: sessionId
      }) as unknown as ChatResponse;
      
      // Add assistant message to UI
      const assistantMsgId = uuidv4();
      set(state => ({
        isTyping: false,
        messages: [...state.messages, {
            id: assistantMsgId,
            role: 'assistant',
            content: response.content,
            toolCalls: response.toolCalls,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]
      }));

    } catch (error: any) {
      console.error('Failed to send skill chat message:', error);
      
      const errorMsgId = uuidv4();
      set(state => ({
        isTyping: false,
        messages: [...state.messages, {
            id: errorMsgId,
            role: 'assistant',
            content: `Error: ${error.message || JSON.stringify(error)}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]
      }));
    }
  },

  handleToolStart: (name: string, args: any) => {
    const { messages } = get();
    const lastMsg = messages[messages.length - 1];
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let newMessages = [...messages];
    
    // If last message is user, we need to append an assistant message
    if (!lastMsg || lastMsg.role === 'user') {
        const tempId = 'temp-' + Date.now();
        newMessages.push({
            id: tempId,
            role: 'assistant',
            content: '', // Streaming content could go here
            time: now,
            toolCalls: [{
                name,
                args: JSON.stringify(args),
                status: 'running'
            }]
        });
    } else {
        // Last message is assistant (streaming), append tool call
        const updatedMsg = { ...lastMsg };
        updatedMsg.toolCalls = [
            ...(updatedMsg.toolCalls || []),
            {
                name,
                args: JSON.stringify(args),
                status: 'running' as const
            }
        ];
        newMessages[messages.length - 1] = updatedMsg;
    }
    
    set({ messages: newMessages });
  },

  handleToolEnd: (name: string, output: any) => {
      const { messages } = get();
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'assistant') return;

      const updatedMsg = { ...lastMsg };
      if (!updatedMsg.toolCalls) return;

      // Find the running tool call with same name
      for (let i = updatedMsg.toolCalls.length - 1; i >= 0; i--) {
          if (updatedMsg.toolCalls[i].name === name && updatedMsg.toolCalls[i].status === 'running') {
              updatedMsg.toolCalls[i] = {
                  ...updatedMsg.toolCalls[i],
                  status: 'done',
                  result: typeof output === 'string' ? output : JSON.stringify(output)
              };
              break;
          }
      }
      
      const newMessages = [...messages];
      newMessages[messages.length - 1] = updatedMsg;
      set({ messages: newMessages });
  }
}));
