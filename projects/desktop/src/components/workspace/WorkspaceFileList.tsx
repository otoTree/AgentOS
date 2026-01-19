import React from 'react';
import { FileText, Image as ImageIcon, FileAudio, Code as CodeIcon, Trash2 } from 'lucide-react';
import { cn } from '../../mainview/utils/cn';
import { useWorkspaceStore } from '../../mainview/store/useWorkspaceStore';

export default function WorkspaceFileList() {
  const { files } = useWorkspaceStore();

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'doc': return <FileText className="text-sm" />;
      case 'image': return <ImageIcon className="text-sm" />;
      case 'audio': return <FileAudio className="text-sm" />;
      case 'code': return <CodeIcon className="text-sm" />;
      default: return <FileText className="text-sm" />;
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2 border-b border-border bg-gray-50/50 flex items-center justify-between">
        <span className="text-[11px] font-medium text-black/50 uppercase tracking-wide">Recent Files</span>
        <button className="text-[11px] text-black/50 hover:text-black transition-colors">View All</button>
      </div>
      <div className="divide-y divide-border">
        {files.map(file => (
          <div key={file.name} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white border border-border flex items-center justify-center text-black/60 shadow-sm">
                {getFileIcon(file.type)}
              </div>
              <div>
                <div className="text-[13px] font-medium text-black leading-tight">{file.name}</div>
                <div className="text-[11px] text-black/40 mt-0.5 font-mono">{file.path}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                file.status === 'Indexed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
              )}>
                {file.status}
              </span>
              <button className="text-black/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all transform scale-90 hover:scale-100">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
