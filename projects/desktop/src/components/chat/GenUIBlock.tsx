import React from 'react';
import { Sparkles } from 'lucide-react';

type GenUIBlockProps = {
  content: React.ReactNode;
};

export default function GenUIBlock({ content }: GenUIBlockProps) {
  return (
    <div className="mt-3 border border-border rounded-lg overflow-hidden bg-white shadow-sm select-none">
      <div className="bg-gray-50/80 px-3 py-1.5 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium text-black/50 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="text-purple-500 w-3 h-3" /> Generated UI
        </span>
      </div>
      <div className="p-4">{content}</div>
    </div>
  );
}
