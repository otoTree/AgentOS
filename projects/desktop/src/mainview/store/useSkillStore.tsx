import { create } from 'zustand';
import { Skill } from '@agentos/agent';
import { getRpc } from '../rpc';

type SkillState = {
  skills: Skill[];
  isLoading: boolean;
  loadSkills: () => Promise<void>;
  addSkill: (skill: Skill) => void;
  removeSkill: (name: string) => void;
  generateSkill: (prompt: string) => Promise<void>;
  publishSkill: (skillName: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  isLoading: false,
  loadSkills: async () => {
    set({ isLoading: true });
    try {
        const rpc = await getRpc();
        const res = await rpc.request.listSkills({}) as any;
        set({ skills: res.skills || [] });
    } catch (e) {
        console.error("Failed to load skills", e);
    } finally {
        set({ isLoading: false });
    }
  },
  addSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),
  removeSkill: (name) => set((state) => ({ skills: state.skills.filter(s => s.metadata.name !== name) })),
  generateSkill: async (prompt) => {
      set({ isLoading: true });
      try {
          const rpc = await getRpc();
          const res = await rpc.request.generateSkill({ prompt }) as any;
          if (res.success) {
              await get().loadSkills();
          }
      } catch (e) {
          console.error("Failed to generate skill", e);
      } finally {
          set({ isLoading: false });
      }
  },
  publishSkill: async (skillName) => {
      try {
          const rpc = await getRpc();
          const res = await rpc.request.publishSkill({ skillName }) as any;
          if (res.success) {
              await get().loadSkills();
          }
      } catch (e) {
           console.error("Failed to publish skill", e);
      }
  }
}));
