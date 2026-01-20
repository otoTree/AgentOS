import React, { useEffect } from 'react';
import { FileText, Trash2, Globe, Cloud, UploadCloud } from 'lucide-react';
import { useSkillStore } from '../../mainview/store/useSkillStore';

export default function InstalledSkills() {
  const { skills, loadSkills, publishSkill } = useSkillStore();

  useEffect(() => {
    loadSkills();
  }, []);

  const getIcon = (name: string) => {
    return FileText;
  };
  
  const getColor = (name: string) => {
      const colors = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-black/80">Installed Skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {skills.map(skill => {
           const Icon = getIcon(skill.metadata.name);
           const color = getColor(skill.metadata.name);
           const isPublic = skill.cloudConfig?.isPublic;
           const syncStatus = skill.cloudConfig?.syncStatus || 'local-only';
           
           return (
          <div
            key={skill.metadata.name}
            className="bg-white border border-border rounded-xl p-4 hover:border-black/20 hover:shadow-sm transition-all cursor-default group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg border border-black/5">
                <Icon style={{ color: color }} size={18} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isPublic && (
                    <button 
                        onClick={() => publishSkill(skill.metadata.name)}
                        className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors"
                        title="Publish to Cloud"
                    >
                        <UploadCloud size={12} />
                    </button>
                )}
                <button className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors">
                  <FileText size={12} />
                </button>
                <button className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-[13px] text-black">{skill.metadata.name}</h4>
            <p className="text-[11px] text-black/50 mt-1 flex-1 leading-relaxed line-clamp-2">{skill.metadata.description}</p>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-black/40 border-t border-border pt-2">
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-black/60 font-mono">v{skill.metadata.version}</span>
              <span className="flex items-center gap-1">
                  {isPublic ? <Globe size={10} /> : <Cloud size={10} />}
                  {syncStatus}
              </span>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
