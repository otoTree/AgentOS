import React from 'react';
import { Message } from '../../mainview/types';
import ChatMessageItem from './ChatMessageItem';
import TypingIndicator from './TypingIndicator';

type ChatMessagesProps = {
  messages: Message[];
  isTyping: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
};

export default function ChatMessages({ messages, isTyping, containerRef }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6" id="chat-container" ref={containerRef}>
      {messages.map(message => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
