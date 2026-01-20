import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSkillStore } from '../../mainview/store/useSkillStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export default function SkillGenerator() {
  const [prompt, setPrompt] = useState('');
  const { generateSkill, isLoading } = useSkillStore();

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    await generateSkill(prompt);
    setPrompt('');
  };

  return (
    <div className="bg-zinc-50/50 border border-black/5 rounded-xl p-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-black/40 w-4 h-4" />
        <h3 className="text-sm font-medium text-black/70">New Skill</h3>
      </div>

      <div className="flex gap-2 bg-white p-1 rounded-lg border border-black/5 shadow-sm focus-within:ring-1 focus-within:ring-black/5 transition-all">
        <Input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Describe functionality (e.g., 'Summarize web page')..."
          disabled={isLoading}
          className="flex-1 border-none shadow-none focus-visible:ring-0 h-9 bg-transparent placeholder:text-black/30"
        />
        <Button 
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            size="sm"
            className="h-9 px-4 bg-black text-white hover:bg-black/80 rounded-md shadow-none transition-all"
        >
          {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : 'Generate'}
        </Button>
      </div>
    </div>
  );
}
