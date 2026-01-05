import { createContext, useContext } from 'react';
import { WordKernel } from '@agentos/office';

export const EditorContext = createContext<{ kernel: WordKernel } | null>(null);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};
