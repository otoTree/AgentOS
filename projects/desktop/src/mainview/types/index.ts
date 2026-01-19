export type Tab = 'chat' | 'workspace' | 'skills' | 'tasks' | 'settings';

export interface Message {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  toolCalls?: { name: string; args: string; status: 'running' | 'done' }[];
  genUI?: React.ReactNode;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'doc' | 'image' | 'audio' | 'code';
  status: 'Indexed' | 'Processing';
}

export interface Skill {
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  type: string;
}

export interface Task {
  id: number;
  name: string;
  progress: number;
  status: 'running' | 'done' | 'pending';
  detail: string;
  time: string;
}
