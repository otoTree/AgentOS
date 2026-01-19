import React from 'react';
import { cn } from '../../mainview/utils/cn';
import { Message } from '../../mainview/types';
import GenUIBlock from './GenUIBlock';
import ToolCallsList from './ToolCallsList';

type ChatMessageItemProps = {
  message: Message;
};

export default function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === 'user';

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
        <div className="text-black/90 leading-relaxed text-[14px]">
          <p dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br/>') }}></p>
        </div>
        {message.genUI && <GenUIBlock content={message.genUI} />}
        {message.toolCalls && <ToolCallsList toolCalls={message.toolCalls} />}
      </div>
    </div>
  );
}
