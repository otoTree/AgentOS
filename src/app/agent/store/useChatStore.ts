import { WindowMode } from '@/components/ui/window-container';
import { create } from 'zustand';

export interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date | string;
}

export interface ActiveWindow {
    id: string;
    type: 'file-browser' | 'email' | 'browser' | 'workbench' | 'editor';
    title: string;
    mode: WindowMode;
    data?: any;
}

interface ChatState {
  messages: AgentMessage[];
  isLoading: boolean;
  input: string;
  activeBrowserSessionId: string | null;
  browserState: {
    sessionId?: string;
    url?: string;
    screenshot?: string;
  } | null;
  windows: ActiveWindow[];
  
  // Actions
  setMessages: (messages: AgentMessage[] | ((prev: AgentMessage[]) => AgentMessage[])) => void;
  addMessage: (message: AgentMessage) => void;
  setInput: (input: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setActiveBrowserSessionId: (id: string | null) => void;
  setBrowserState: (state: any) => void;
  
  // Window Actions
  openWindow: (type: ActiveWindow['type'], data?: any) => void;
  closeWindow: (id: string) => void;
  updateWindowMode: (id: string, mode: WindowMode) => void;
  
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  input: '',
  activeBrowserSessionId: null,
  browserState: null,
  windows: [],

  setMessages: (messagesOrFn) => set((state) => ({
    messages: typeof messagesOrFn === 'function' ? messagesOrFn(state.messages) : messagesOrFn
  })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setInput: (input) => set({ input }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveBrowserSessionId: (id) => set({ activeBrowserSessionId: id }),
  setBrowserState: (state) => set({ browserState: state }),
  
  openWindow: (type, data) => {
      const { windows } = get();
      // Check if already open
      const existing = windows.find(w => w.type === type && (type !== 'editor' || w.data?.id === data?.id));
      if (existing) {
          // Bring to front or highlight? (TODO)
          return;
      }

      const id = Date.now().toString();
      set((state) => ({
          windows: [...state.windows, {
              id,
              type,
              title: type === 'file-browser' ? 'Files' : type === 'workbench' ? 'Workbench' : (data?.name || 'Editor'),
              mode: 'floating',
              data
          }]
      }));
  },
  
  closeWindow: (id) => set((state) => ({
      windows: state.windows.filter(w => w.id !== id)
  })),
  
  updateWindowMode: (id, mode) => set((state) => ({
      windows: state.windows.map(w => w.id === id ? { ...w, mode } : w)
  })),

  reset: () => set({ 
    messages: [], 
    isLoading: false, 
    input: '', 
    activeBrowserSessionId: null, 
    browserState: null,
    windows: []
  }),
}));
