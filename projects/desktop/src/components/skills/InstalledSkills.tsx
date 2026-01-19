import React from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { useSkillStore } from '../../mainview/store/useSkillStore';

export default function InstalledSkills() {
  const { skills } = useSkillStore();

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-black/80">Installed Skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {skills.map(skill => (
          <div
            key={skill.name}
            className="bg-white border border-border rounded-xl p-4 hover:border-black/20 hover:shadow-sm transition-all cursor-default group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg border border-black/5">
                <skill.icon style={{ color: skill.color }} size={18} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors">
                  <FileText size={12} />
                </button>
                <button className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-[13px] text-black">{skill.name}</h4>
            <p className="text-[11px] text-black/50 mt-1 flex-1 leading-relaxed">{skill.desc}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-black/40 border-t border-border pt-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-black/60 font-mono">v1.0.2</span>
              <span>{skill.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
