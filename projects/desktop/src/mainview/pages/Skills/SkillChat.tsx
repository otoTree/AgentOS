import React, { useEffect, useRef } from 'react';
import ChatMessages from '../../../components/chat/ChatMessages';
import ChatInputArea from '../../../components/chat/ChatInputArea';
import { useSkillChatStore } from '../../store/useSkillChatStore';
import { useSkillEditorStore } from '../../store/useSkillEditorStore';

export default function SkillChat() {
  const { messages, chatInput, isTyping, setChatInput, sendMessage, initializeSession } = useSkillChatStore();
  const { currentSkillName } = useSkillEditorStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentSkillName) {
        initializeSession(currentSkillName);
    }
  }, [currentSkillName]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-transparent h-full">
      <ChatMessages messages={messages} isTyping={isTyping} containerRef={chatContainerRef} />
      <div className="p-2">
        <ChatInputArea
            chatInput={chatInput}
            onChange={setChatInput}
            onSend={sendMessage}
        />
      </div>
    </div>
  );
}
