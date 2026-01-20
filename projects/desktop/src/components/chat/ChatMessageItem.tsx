import React, { useMemo } from 'react';
import { cn } from '../../mainview/utils/cn';
import { Message } from '../../mainview/types';
import GenUIBlock from './GenUIBlock';
import ToolCallsList from './ToolCallsList';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import JsonUI from './JsonUI';

type ChatMessageItemProps = {
  message: Message;
};

export default function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  // Extract content segments (mixed text and JSON blocks)
  const segments = useMemo(() => {
    if (isUser) return [{ type: 'text', content: message.content || '' }];
    if (!message.content) return [];

    const result: { type: 'text' | 'json', content: any }[] = [];
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    
    let lastIndex = 0;
    let match;

    while ((match = jsonBlockRegex.exec(message.content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: message.content.slice(lastIndex, match.index)
        });
      }

      const codeContent = match[1];
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(codeContent.trim());
        result.push({
          type: 'json',
          content: parsed
        });
      } catch (e) {
        // If not valid JSON, treat as regular markdown code block
        result.push({
          type: 'text',
          content: match[0] // Use the full match including backticks
        });
      }

      lastIndex = jsonBlockRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < message.content.length) {
      result.push({
        type: 'text',
        content: message.content.slice(lastIndex)
      });
    }

    return result;
  }, [message.content, isUser]);

  return (
    <div className="flex gap-4 max-w-3xl mx-auto w-full group select-text">
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 border border-black/5 shadow-sm',
          isUser ? 'bg-gray-100' : 'bg-black text-white'
        )}
      >
        <span className="font-bold text-xs">{isUser ? '' : 'A'}</span>
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-black">{isUser ? 'You' : 'AgentOS'}</span>
          <span className="text-[11px] text-black/40">{message.time}</span>
        </div>
        
        <div className="space-y-4">
          {segments.map((segment, i) => {
            if (segment.type === 'json') {
              return <GenUIBlock key={i} content={<JsonUI data={segment.content} />} />;
            }
            return (
              <div key={i} className="text-black/90 leading-relaxed text-[14px] prose prose-sm max-w-none prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {segment.content}
                </ReactMarkdown>
              </div>
            );
          })}
        </div>

        {message.genUI && <GenUIBlock content={message.genUI} />}
        
        {/* Visible Debug Info */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="text-xs text-red-500 border border-red-500 p-1 mb-2">
             Debug: ToolCalls found ({message.toolCalls.length})
          </div>
        )}

        {message.toolCalls && <ToolCallsList toolCalls={message.toolCalls} />}
      </div>
    </div>
  );
}

