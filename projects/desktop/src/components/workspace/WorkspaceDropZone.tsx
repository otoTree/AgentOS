import React from 'react';
import { CloudUpload } from 'lucide-react';

export default function WorkspaceDropZone() {
  return (
    <div className="border border-dashed border-black/20 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-all mb-6 group cursor-default">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        <CloudUpload className="text-lg text-black/40 group-hover:text-black" />
      </div>
      <h3 className="font-medium text-black">Drop files to index</h3>
      <p className="text-[11px] text-black/40 mt-1">Support PDF, MD, PNG, MP3, and Code files.</p>
    </div>
  );
}
