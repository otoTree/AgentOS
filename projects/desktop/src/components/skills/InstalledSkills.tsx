import React, { useEffect } from 'react';
import { FileText, Trash2, Globe, Cloud, UploadCloud, Edit } from 'lucide-react';
import { useSkillStore } from '../../mainview/store/useSkillStore';
import { useSkillEditorStore } from '../../mainview/store/useSkillEditorStore';

export default function InstalledSkills() {
  const { skills, loadSkills, publishSkill, deleteSkill } = useSkillStore();
  const { openSkill } = useSkillEditorStore();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

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

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(name);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
        await deleteSkill(deleteTarget);
        setDeleteTarget(null);
    }
  };

  const cancelDelete = () => {
      setDeleteTarget(null);
  };

  const handlePublish = async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    await publishSkill(name);
  };

  const handleOpen = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    openSkill(name);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 text-black/80">Installed Skills</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {skills.map(skill => {
           const displayName = skill.metadata.displayName || skill.metadata.name;
           const Icon = getIcon(skill.metadata.name);
           const color = getColor(skill.metadata.name);
           const isPublic = skill.cloudConfig?.isPublic;
           const syncStatus = skill.cloudConfig?.syncStatus || 'local-only';
           
           return (
          <div
            key={skill.metadata.name}
            onClick={() => openSkill(skill.metadata.name)}
            className="bg-white border border-border rounded-xl p-4 hover:border-black/20 hover:shadow-sm transition-all cursor-pointer group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center text-lg border border-black/5">
                <Icon style={{ color: color }} size={18} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isPublic && (
                    <button 
                        type="button"
                        onClick={(e) => handlePublish(e, skill.metadata.name)}
                        className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors z-10"
                        title="Publish to Cloud"
                    >
                        <UploadCloud size={12} />
                    </button>
                )}
                <button 
                    type="button"
                    onClick={(e) => handleOpen(e, skill.metadata.name)}
                    className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors z-10"
                    title="Edit Skill"
                >
                  <Edit size={12} />
                </button>
                <button 
                    type="button"
                    onClick={(e) => handleDelete(e, skill.metadata.name)}
                    className="w-6 h-6 hover:bg-gray-100 rounded flex items-center justify-center text-xs text-black/60 transition-colors z-10"
                    title="Delete Skill"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <h4 className="font-semibold text-[13px] text-black">{displayName}</h4>
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

      {/* Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-lg border border-black/10 p-6 max-w-sm w-full mx-4 scale-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-black mb-2">Delete Skill?</h3>
                <p className="text-sm text-black/60 mb-6">
                    Are you sure you want to delete <span className="font-medium text-black">{deleteTarget}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={cancelDelete}
                        className="px-4 py-2 text-sm font-medium text-black/70 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 text-sm font-medium text-black/70 bg-red-600er:bg-red-700 rounded-lg transition-colors  hovshadow-sm"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
