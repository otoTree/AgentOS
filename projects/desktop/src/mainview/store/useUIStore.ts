import { create } from 'zustand';
import { Tab } from '../types';

interface UIState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'chat',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
