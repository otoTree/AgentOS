  import React, { useState } from 'react';
import { Sparkles, User, Loader2 } from 'lucide-react';
import { useSkillStore } from '../../mainview/store/useSkillStore';

export default function SkillGenerator() {
  const [prompt, setPrompt] = useState('');
  const { generateSkill, isLoading } = useSkillStore();

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    await generateSkill(prompt);
    setPrompt('');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-xl p-5 mb-8 relative overflow-hidden shadow-sm">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-indigo-900">
        <Sparkles className="text-indigo-500 w-4 h-4" /> Generate New Skill
      </h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g., 'Create a skill that scrapes a website and summarizes it in bullet points'"
          disabled={isLoading}
          className="flex-1 bg-white border border-black/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-[13px] shadow-sm disabled:opacity-50"
        />
        <button 
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : 'Generate'}
        </button>
      </div>
    </div>
  );
}
