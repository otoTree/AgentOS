import { create } from 'zustand';
import { Skill } from '../types';
import { Globe, Mail, GitBranch, ImageIcon, FileText } from 'lucide-react';

type SkillState = {
  skills: Skill[];
  addSkill: (skill: Skill) => void;
  removeSkill: (name: string) => void;
}

const initialSkills: Skill[] = [
  { name: 'Web Scraper', desc: 'Extract content from any URL and convert to Markdown.', icon: Globe as any, color: '#60a5fa', type: 'Official' },
  { name: 'Email Drafter', desc: 'Draft professional emails based on brief bullet points.', icon: Mail as any, color: '#a78bfa', type: 'Productivity' },
  { name: 'Code Reviewer', desc: 'Analyze PRs and suggest improvements.', icon: GitBranch as any, color: '#34d399', type: 'DevTool' },
  { name: 'Image Gen', desc: 'Create images using Stable Diffusion locally.', icon: ImageIcon as any, color: '#f472b6', type: 'Creative' },
  { name: 'PDF Chat', desc: 'RAG pipeline specifically optimized for large PDFs.', icon: FileText as any, color: '#fbbf24', type: 'Official' },
];

export const useSkillStore = create<SkillState>((set) => ({
  skills: initialSkills,
  addSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),
  removeSkill: (name) => set((state) => ({ skills: state.skills.filter(s => s.name !== name) })),
}));
