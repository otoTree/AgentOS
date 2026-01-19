import React from 'react';
import { Sparkles, User } from 'lucide-react';

export default function SkillGenerator() {
  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-xl p-5 mb-8 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <User size={96} />
      </div>

      <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-indigo-900">
        <Sparkles className="text-indigo-500 w-4 h-4" /> Generate New Skill
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g., 'Create a skill that scrapes a website and summarizes it in bullet points'"
          className="flex-1 bg-white border border-black/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-[13px] shadow-sm"
        />
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-xs">
          Generate
        </button>
      </div>
    </div>
  );
}
