import React from 'react';
import { Cpu, Cloud } from 'lucide-react';

export default function AIModelsSection() {
  return (
    <section>
      <h3 className="text-sm font-semibold text-black/90 mb-4 pb-2 border-b border-border">AI Models</h3>
      <div className="space-y-4">
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Cpu size={16} />
              </div>
              <div>
                <div className="font-medium">Local Inference</div>
                <div className="text-[11px] text-black/50">Ollama (running on port 11434)</div>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Connected
            </span>
          </div>
          <div className="text-[12px] text-black/60 pl-11">
            <p>
              Default Model: <span className="font-mono bg-gray-100 px-1 rounded">llama3:8b</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-4 shadow-sm opacity-60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Cloud size={16} />
              </div>
              <div>
                <div className="font-medium">Cloud Provider</div>
                <div className="text-[11px] text-black/50">OpenAI / Anthropic</div>
              </div>
            </div>
            <button className="text-[11px] border border-black/10 px-2 py-1 rounded bg-white hover:bg-gray-50 transition-colors shadow-sm">
              Configure
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
