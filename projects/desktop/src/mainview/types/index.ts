export type Tab = 'chat' | 'workspace' | 'skills' | 'tasks' | 'settings';

export type Message = {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  toolCalls?: { name: string; args: string; status: 'running' | 'done' }[];
  genUI?: React.ReactNode;
}

export type FileItem = {
  name: string;
  path: string;
  type: 'doc' | 'image' | 'audio' | 'code';
  status: 'Indexed' | 'Processing';
}

export type Skill = {
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  type: string;
}

export type Task = {
  id: number;
  name: string;
  progress: number;
  status: 'running' | 'done' | 'pending';
  detail: string;
  time: string;
}
