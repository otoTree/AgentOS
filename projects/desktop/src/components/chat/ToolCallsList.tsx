import React from 'react';
import { Check } from 'lucide-react';
import { Message } from '../../mainview/types';

type ToolCallsListProps = {
  toolCalls: NonNullable<Message['toolCalls']>;
};

export default function ToolCallsList({ toolCalls }: ToolCallsListProps) {
  return (
    <div className="space-y-1.5 mt-2">
      {toolCalls.map((tool, index) => (
        <div
          key={`${tool.name}-${index}`}
          className="flex items-center gap-2 text-[11px] font-mono border border-border rounded px-2 py-1 w-fit bg-gray-50/50"
        >
          <span className="text-black/40">exec:</span>
          <span className="text-black/80">{tool.name}</span>
          <span className="text-black/40 truncate max-w-[150px]">{tool.args}</span>
          {tool.status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse ml-1"></span>
          )}
          {tool.status === 'done' && (
            <span className="text-emerald-500 ml-1">
              <Check size={10} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
