import React, { useEffect, useRef } from 'react';
import ChatMessages from '../../../components/chat/ChatMessages';
import ChatInputArea from '../../../components/chat/ChatInputArea';
import { useChatStore } from '../../store/useChatStore';

export default function ChatPage() {
  const { messages, chatInput, isTyping, setChatInput, sendMessage, fetchHistory } = useChatStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <ChatMessages messages={messages} isTyping={isTyping} containerRef={chatContainerRef} />
      <ChatInputArea
        chatInput={chatInput}
        onChange={setChatInput}
        onSend={sendMessage}
      />
    </div>
  );
}
