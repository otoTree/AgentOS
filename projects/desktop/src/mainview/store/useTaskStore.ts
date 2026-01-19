import { create } from 'zustand';
import { Task } from '../types';

type TaskState = {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
}

const initialTasks: Task[] = [
  { id: 1, name: 'Batch Image Resize', progress: 45, status: 'running', detail: 'Processing 45/100 images in /assets...', time: '2m remaining' },
  { id: 2, name: 'Update Vector Index', progress: 100, status: 'done', detail: 'Successfully indexed 12 new files.', time: 'Just now' },
  { id: 3, name: 'Daily News Summary', progress: 0, status: 'pending', detail: 'Scheduled for 8:00 AM', time: 'Tomorrow' },
];

export const useTaskStore = create<TaskState>((set) => ({
  tasks: initialTasks,
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
}));
