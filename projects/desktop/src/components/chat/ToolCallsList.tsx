import React, { useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Message } from '../../mainview/types';
import JsonUI from './JsonUI';
import { extractJson } from "@agentos/global/utils/json";

type ToolCallsListProps = {
  toolCalls: NonNullable<Message['toolCalls']>;
};

export default function ToolCallsList({ toolCalls }: ToolCallsListProps) {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  function tryParseJson(str: string) {
    const extracted = extractJson(str);
    return extracted !== null ? extracted : str;
  }

  //if (!toolCalls || toolCalls.length === 0) return <div className="text-red-500">No tools</div>;

  return (
    <div className="space-y-1.5 mt-2 pl-2">
      {toolCalls.map((tool, index) => {
        const isExpanded = expandedIndices.includes(index);
        const hasResult = tool.status === 'done' && tool.result;

        return (
          <div key={`${tool.name}-${index}`} className="flex flex-col gap-1">
            <div
              className={`flex items-center gap-2 text-[11px] font-mono border border-border rounded px-2 py-1 w-fit bg-gray-50/50 ${hasResult ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
              onClick={() => hasResult && toggleExpand(index)}
            >
              <span className="text-black/40">exec:</span>
              <span className="text-black/80">{tool.name}</span>
              <span className="text-black/40 truncate max-w-[150px]">{tool.args}</span>
              {tool.status === 'running' && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse ml-1"></span>
              )}
              {tool.status === 'done' && (
                <span className="text-emerald-500 ml-1 flex items-center gap-1">
                  <Check size={10} />
                  {hasResult && (
                    isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
                  )}
                </span>
              )}
            </div>
            
            {isExpanded && tool.result && (
              <div className="ml-2 mt-1 max-w-full overflow-hidden">
                 <JsonUI data={tryParseJson(tool.result)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
