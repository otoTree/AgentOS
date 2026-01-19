import React from 'react';
import { CheckCircle, RefreshCw } from 'lucide-react';

export default function WorkspaceStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="text-black/50 text-[11px] font-medium uppercase tracking-wide">Indexed Files</div>
        <div className="text-2xl font-semibold mt-1 tracking-tight text-black">1,204</div>
        <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
          <CheckCircle size={12} /> Up to date
        </div>
      </div>
      <div className="bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="text-black/50 text-[11px] font-medium uppercase tracking-wide">Storage Used</div>
        <div className="text-2xl font-semibold mt-1 tracking-tight text-black">450 MB</div>
        <div className="text-[11px] text-black/40 mt-1">Local Vector DB</div>
      </div>
      <div className="bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="text-black/50 text-[11px] font-medium uppercase tracking-wide">Watch Folders</div>
        <div className="text-2xl font-semibold mt-1 tracking-tight text-black">3</div>
        <div className="text-[11px] text-blue-500 mt-1 flex items-center gap-1 font-medium">
          <RefreshCw size={12} className="animate-spin" /> Syncing...
        </div>
      </div>
    </div>
  );
}
