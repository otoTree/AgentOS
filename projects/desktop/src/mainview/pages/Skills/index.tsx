import React from 'react';
import SkillGenerator from '../../../components/skills/SkillGenerator';
import InstalledSkills from '../../../components/skills/InstalledSkills';

export default function SkillsPage() {
  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-slide-in">
        <div className="max-w-4xl mx-auto w-full">
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-black">Skill Studio</h1>
            <p className="text-black/50 mb-8 text-[13px]">Create custom tools and skills using natural language.</p>

            <SkillGenerator />
            <InstalledSkills />
        </div>
    </div>
  );
}
