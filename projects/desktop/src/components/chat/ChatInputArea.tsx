import React from 'react';
import { Paperclip, Plus, ArrowUp } from 'lucide-react';
import { cn } from '../../mainview/utils/cn';

type ChatInputAreaProps = {
  chatInput: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatInputArea({ chatInput, onChange, onSend }: ChatInputAreaProps) {
  return (
    <div className="p-4 pt-0">
      <div className="max-w-3xl mx-auto relative">
        <div className="bg-white border border-border rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/20 transition-all flex flex-col">
          <textarea
            value={chatInput}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            className="bg-transparent text-black p-3 w-full outline-none resize-none min-h-[48px] max-h-[200px] placeholder:text-black/30 text-[14px]"
            placeholder="Type a message..."
            rows={1}
          ></textarea>

          <div className="px-2 py-1.5 flex items-center justify-between border-t border-border/50">
            <div className="flex items-center gap-1">
              <button
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-black/40 hover:text-black transition-colors"
                title="Attach"
              >
                <Paperclip size={14} />
              </button>
              <button
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/5 text-black/40 hover:text-black transition-colors"
                title="Tools"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={onSend}
              className={cn(
                'w-7 h-7 rounded flex items-center justify-center transition-all duration-200',
                chatInput.trim() ? 'bg-black text-white hover:bg-black/80' : 'bg-gray-100 text-gray-300'
              )}
            >
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-black/30">AgentOS Native Runtime v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
