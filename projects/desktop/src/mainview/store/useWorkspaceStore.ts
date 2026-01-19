import { create } from 'zustand';
import { FileItem } from '../types';

interface WorkspaceState {
  files: FileItem[];
  addFile: (file: FileItem) => void;
  removeFile: (name: string) => void;
}

const initialFiles: FileItem[] = [
  { name: 'desktop_spec.md', path: '/docs/specs', type: 'doc', status: 'Indexed' },
  { name: 'ui_mockup_v1.png', path: '/docs/ui', type: 'image', status: 'Indexed' },
  { name: 'meeting_notes.mp3', path: '/downloads', type: 'audio', status: 'Processing' },
  { name: 'main.py', path: '/src/core', type: 'code', status: 'Indexed' },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  files: initialFiles,
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (name) => set((state) => ({ files: state.files.filter(f => f.name !== name) })),
}));
