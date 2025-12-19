'use client';

import { useState, useRef, useEffect } from 'react';
import { sendMessage, addToolToConversation, removeToolFromConversation, getPublicTools, deleteConversation, uploadAgentFile, removeFileFromConversation, addFileToConversation, getFiles, updateFileContent } from '../actions';
import { WindowManager, ActiveWindow } from './window-manager';
import { WindowMode } from '@/components/ui/window-container';
import { getDownloadUrl } from '../actions';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from "@/components/ui/sonner";
import { useChatStore } from '../store/useChatStore';

import { ChatHeader } from './components/chat-header';
import { MessageList } from './components/message-list';
import { ChatInput } from './components/chat-input';
import { ContextSidebar } from './components/context-sidebar';
import { FilePreviewModal } from './components/file-preview-modal';

interface Tool {
    id: string;
    name: string;
    description: string | null;
    projectName?: string;
}

interface ChatInterfaceProps {
  conversation: any;
}

export default function ChatInterface({ conversation }: ChatInterfaceProps) {
  const { 
    messages, setMessages, addMessage,
    input, setInput,
    isLoading, setIsLoading,
    activeBrowserSessionId, setActiveBrowserSessionId,
    browserState, setBrowserState,
    reset: resetStore,
    windows, openWindow, closeWindow, updateWindowMode
  } = useChatStore();

  const [enabledTools, setEnabledTools] = useState<Tool[]>(conversation.tools?.map((t: any) => t.tool) || []);
  const [attachedFiles, setAttachedFiles] = useState(conversation.files?.map((f: any) => f.file) || []);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'enabled' | 'marketplace' | 'files' | 'browser'>('marketplace');
  const [isUploading, setIsUploading] = useState(false);
  
  const [allFiles, setAllFiles] = useState<any[]>([]);
  
  const processedCallIds = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  // Initialize store from conversation prop
  useEffect(() => {
    // We only reset if we are switching conversations
    // Check if the store is empty or has a different conversation's messages? 
    // Since we don't store conversationId in store, we might just want to sync if messages are empty
    // OR just blindly sync on mount.
    
    // Better approach: Sync on mount.
    if (conversation.messages) {
       // Only set if store is empty to avoid overwriting optimistic updates during re-renders
       // But wait, if we navigate back and forth, we want fresh data.
       // Let's rely on the fact that when we navigate to a new [id], this component mounts.
       setMessages(conversation.messages);
    }
    
    if (conversation.browserSessionId) {
       setActiveBrowserSessionId(conversation.browserSessionId);
       setBrowserState({
          sessionId: conversation.browserSessionId,
          url: conversation.browserUrl || undefined,
          screenshot: conversation.browserScreenshot || undefined
       });
    }

    return () => {
        // Optional: clear store on unmount? 
        // If we want to keep state when navigating away and back, don't clear.
        // But if we navigate to a DIFFERENT agent, we should clear.
        // The store is global.
        resetStore();
    };
  }, [conversation.id]); // Only run when conversation ID changes

  useEffect(() => {
    if (pathname) {
      localStorage.setItem('agent_os_last_chat_path', pathname);
    }
  }, [pathname]);

  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  // Sync agent-created sessions
  useEffect(() => {
      // Find the latest browser_open session ID from messages
      for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          // We look for tool_result from browser_open
          try {
              if (msg.role === 'system' || msg.role === 'user') {
                  const content = msg.content;
                  if (content.startsWith('{')) {
                      const parsed = JSON.parse(content);
                      if (parsed.type === 'tool_result' && parsed.tool === 'browser_open') {
                           // Output: "Browser opened. Session ID: xyz"
                           const match = parsed.output.match(/Session ID: ([a-zA-Z0-9-]+)/);
                           if (match) {
                               const sessionId = match[1];
                               // Only update if this is a NEW session message we haven't processed yet
                               if (sessionId !== activeBrowserSessionId) {
                                   setActiveBrowserSessionId(sessionId);
                               }
                               break; // Found latest session ID
                           }
                      }
                  } else {
                      // Text format check
                      if ((content.includes('browser_open') || content.includes('Tool Execution')) && content.includes('Session ID:')) {
                           const match = content.match(/Session ID: ([a-zA-Z0-9-]+)/);
                           if (match) {
                               const sessionId = match[1];
                               if (sessionId !== activeBrowserSessionId) {
                                   setActiveBrowserSessionId(sessionId);
                               }
                               break;
                           }
                      }
                  }
              }
          } catch (e) { /* ignore */ }
      }

  }, [messages]);

  // Handle file preview
  useEffect(() => {
      if (previewFile) {
          setPreviewLoading(true);
          setPreviewContent(null);
          
          getDownloadUrl(previewFile.id)
              .then(url => {
                  setPreviewUrl(url);
                  
                  // Check if text/code for editing
                  const isEditable = previewFile.mimeType.startsWith("text/") ||
                                     previewFile.mimeType === "application/json" ||
                                     previewFile.mimeType.includes("javascript") ||
                                     previewFile.mimeType.includes("typescript") ||
                                     previewFile.mimeType.includes("xml") ||
                                     previewFile.name.endsWith(".ts") ||
                                     previewFile.name.endsWith(".tsx") ||
                                     previewFile.name.endsWith(".js") ||
                                     previewFile.name.endsWith(".jsx") ||
                                     previewFile.name.endsWith(".md") ||
                                     previewFile.name.endsWith(".json") ||
                                     previewFile.name.endsWith(".css") ||
                                     previewFile.name.endsWith(".html") ||
                                     previewFile.name.endsWith(".py");
                  
                  if (isEditable) {
                      return fetch(url).then(res => res.text()).then(text => setPreviewContent(text));
                  }
              })
              .catch(err => {
                  console.error("Failed to load file preview", err);
                  setPreviewUrl(null);
              })
              .finally(() => setPreviewLoading(false));
      } else {
          setPreviewUrl(null);
          setPreviewContent(null);
          setIsEditing(false);
      }
  }, [previewFile]);

  // Polling effect
  useEffect(() => {
      let intervalId: NodeJS.Timeout;

      if (isLoading) {
          intervalId = setInterval(async () => {
              try {
                  const res = await fetch(`/api/agent/${conversation.id}?t=${Date.now()}`);
                  if (res.ok) {
                      const data = await res.json();
                      // Update messages but preserve optimistic ones not yet synced
                      setMessages((prev) => {
                          const serverMessages = data.messages;
                          const localTemps = prev.filter(m => m.id.toString().startsWith('temp-'));
                          
                          // Filter out temps that have been synced (matched by content)
                          const pendingTemps = localTemps.filter(temp => {
                              // Check if this temp message is already in serverMessages
                              // We look for a message with same role and content at the end of the list
                              // to avoid false positives with repeated messages earlier in chat
                              const match = serverMessages.slice(-5).find((sm: any) =>
                                  sm.role === temp.role && sm.content === temp.content
                              );
                              return !match;
                          });

                          return [...serverMessages, ...pendingTemps];
                      });
                      
                      // Update tools if changed (e.g. auto-enabled)
                      if (data.tools) {
                          setEnabledTools(data.tools.map((t: any) => t.tool));
                      }
                      if (data.files) {
                          setAttachedFiles(data.files.map((f: any) => f.file));
                      }
                      
                      // Sync browser state from server (for cross-tab or reload sync)
                      if (data.browserSessionId) {
                          if (data.browserSessionId !== activeBrowserSessionId) {
                              setActiveBrowserSessionId(data.browserSessionId);
                          }
                          // Update browser state if it's newer or we don't have one
                          setBrowserState({
                                  sessionId: data.browserSessionId,
                                  url: data.browserUrl || undefined,
                                  screenshot: data.browserScreenshot || undefined
                          });
                      }
                  }
              } catch (error) {
                  console.error("Polling failed", error);
              }
          }, 1000);
      }

      return () => {
          if (intervalId) clearInterval(intervalId);
      };
  }, [isLoading, conversation.id]);

  // Handle open_window tool calls
  useEffect(() => {
      // Scan recent messages for tool calls
      // We check the last few messages to catch any that arrived
      const recentMessages = messages.slice(-3);
      
      recentMessages.forEach((msg: any) => {
          if (msg.role === 'assistant') {
              try {
                  const content = JSON.parse(msg.content);
                  if (content.tool_calls) {
                      content.tool_calls.forEach((call: any) => {
                          if (call.name === 'open_window') {
                               if (processedCallIds.current.has(call.id)) return;
                               processedCallIds.current.add(call.id);
                               
                               const { window_type, file_id } = call.arguments;
                               
                               if (window_type === 'files') openWindow('file-browser');
                               else if (window_type === 'workbench') openWindow('workbench');
                               else if (window_type === 'email') openWindow('email');
                               else if (window_type === 'browser') openWindow('browser', { sessionId: activeBrowserSessionId, state: browserState });
                               else if (window_type === 'editor') {
                                   if (file_id) {
                                       openWindow('editor', { id: file_id });
                                   } else {
                                       openWindow('editor');
                                   }
                               }
                          }
                      });
                  }
              } catch (e) { /* ignore */ }
          }
      });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent, overrideContent?: string) => {
    e?.preventDefault();
    const contentToSend = overrideContent || input;
    if (!contentToSend.trim() && allFiles.length === 0) return;

    // Command Handling
    if (contentToSend.startsWith('/')) {
        const cmd = contentToSend.slice(1).trim();
        const [command, ...args] = cmd.split(' ');
        
        if (command === 'open') {
            const target = args[0]?.toLowerCase();
            if (target === 'files') {
                openWindow('file-browser');
                setInput('');
                return;
            } else if (target === 'workbench') {
                openWindow('workbench');
                setInput('');
                return;
            } else if (target === 'editor') {
                 openWindow('editor');
                 setInput('');
                 return;
            } else if (target === 'email') {
                 openWindow('email');
                 setInput('');
                 return;
            } else if (target === 'browser') {
                 openWindow('browser', { sessionId: activeBrowserSessionId, state: browserState });
                 setInput('');
                 return;
            }
        }
    }

    // Just send the text content. Files are already linked to the conversation on backend.
    const userMessage = { 
        role: 'user', 
        content: contentToSend, 
        id: 'temp-' + Date.now(),
        createdAt: new Date().toISOString()
    };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      // Optimistic update done, now call server
      const result = await sendMessage(conversation.id, userMessage.content, { browserSessionId: activeBrowserSessionId || undefined });
      
      // Update browser state if returned (this avoids polling or extra fetch)
      // Note: sendMessage is now async/queued, so it might not return state immediately.
      if (typeof result === 'object' && result !== null && 'browserState' in result) {
          const newState = (result as any).browserState;
          if (newState) {
              setBrowserState(newState);
              if (newState.sessionId && newState.sessionId !== activeBrowserSessionId) {
                  setActiveBrowserSessionId(newState.sessionId);
              }
          }
      }

      // Final refresh to ensure consistency
      router.refresh();
      
      // We don't need to manually append response here because polling/refresh handles it
      // But we should fetch one last time to be sure
      const res = await fetch(`/api/agent/${conversation.id}?t=${Date.now()}`);
      if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
          if (data.tools) setEnabledTools(data.tools.map((t: any) => t.tool));
          if (data.files) setAttachedFiles(data.files.map((f: any) => f.file));
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
      setIsLoading(false);
    } 
  };

  // Auto-manage loading state based on conversation status
  useEffect(() => {
    if (!messages.length) return;
    const lastMsg = messages[messages.length - 1];
    
    // If last message is user, we are waiting.
    if (lastMsg.role === 'user') {
        if (!isLoading) setIsLoading(true);
    } 
    // If last message is assistant
    else if (lastMsg.role === 'assistant') {
        // Check if it's a tool call
        let isTool = false;
        try {
            const content = JSON.parse(lastMsg.content);
            if (content.tool_calls || content.type === 'tool_call') isTool = true;
        } catch(e) { /* ignore */ }
        
        if (isTool) {
             // It's a tool call, so we expect a system result next. Still loading.
             if (!isLoading) setIsLoading(true);
        } else {
             // It's a final text response. Done.
             if (isLoading) setIsLoading(false);
        }
    }
    // If last message is system (tool result), we are waiting for assistant to reply.
    else if (lastMsg.role === 'system') {
        if (!isLoading) setIsLoading(true);
    }
  }, [messages]);

  useEffect(() => {
      const initialMsg = sessionStorage.getItem('agent_initial_message');
      if (initialMsg) {
          sessionStorage.removeItem('agent_initial_message');
          handleSendMessage(undefined, initialMsg);
      }
  }, []);


  const handleAttachToggle = async (fileId: string, attach: boolean) => {
    try {
        if (attach) {
            await addFileToConversation(conversation.id, fileId);
            // Optimistic update
            setAttachedFiles((prev: any[]) => {
                if (prev.find(f => f.id === fileId)) return prev;
                return prev; 
            });
        } else {
            await removeFileFromConversation(conversation.id, fileId);
            setAttachedFiles((prev: any[]) => prev.filter((f: any) => f.id !== fileId));
        }
        // Trigger a refresh to sync state
        router.refresh();
    } catch (error) {
        console.error("Failed to toggle attachment", error);
    }
  };

  const loadTools = async () => {
      setShowToolSelector(true);
      setActiveTab('marketplace');
      const tools = await getPublicTools();
      if (tools) setAvailableTools(tools);
  };

  const openFiles = async () => {
      setShowToolSelector(true);
      setActiveTab('files');
      await loadFiles();
  }

  const loadFiles = async (folderId: string | null = null) => {
      const files = await getFiles("", folderId);
      setAllFiles(files);
  };

  const toggleTool = async (toolId: string) => {
      const isEnabled = enabledTools.find((t: any) => t.id === toolId);
      if (isEnabled) {
          await removeToolFromConversation(conversation.id, toolId);
          setEnabledTools((prev: any) => prev.filter((t: any) => t.id !== toolId));
      } else {
          await addToolToConversation(conversation.id, toolId);
          const toolToAdd = availableTools.find(t => t.id === toolId);
          if (toolToAdd) {
             setEnabledTools((prev: any) => [...prev, toolToAdd]);
          }
      }
      router.refresh();
  };

  const handleDelete = async () => {
      if (confirm("Are you sure you want to delete this conversation?")) {
          await deleteConversation(conversation.id);
          router.push('/agent');
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('conversationId', conversation.id);
          
          await uploadAgentFile(formData);
          // Refresh to show new file in sidebar
          router.refresh();
          // Also manually fetch to update state immediately
          const res = await fetch(`/api/agent/${conversation.id}?t=${Date.now()}`);
          if (res.ok) {
              const data = await res.json();
              if (data.files) setAttachedFiles(data.files.map((f: any) => f.file));
          }
          // Open sidebar to show file
          setShowToolSelector(true);
          setActiveTab('files');

      } catch (error) {
          console.error("Upload failed", error);
          toast.error("Failed to upload file");
      } finally {
          setIsUploading(false);
          // File input reset is handled in ChatInput or by React key/ref if needed
      }
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        <ChatHeader 
            title={conversation.title}
            toolsCount={enabledTools.length}
            onOpenWindow={openWindow}
            onLoadTools={loadTools}
            onDelete={handleDelete}
            activeBrowserSessionId={activeBrowserSessionId}
            browserState={browserState}
        />

        {/* Windows Manager */}
        <div className="absolute top-16 left-0 right-0 z-30 px-4 pointer-events-none">
             <div className="pointer-events-auto">
                 <WindowManager 
                    windows={windows}
                    onUpdateMode={updateWindowMode}
                    onClose={closeWindow}
                    onOpenWindow={openWindow}
                    userId={conversation.userId}
                 />
             </div>
        </div>

        {/* Messages */}
        <MessageList 
            messages={messages}
            isLoading={isLoading}
        />

        {/* Input */}
        <ChatInput 
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isUploading={isUploading}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            enabledTools={enabledTools}
            showEmptyState={messages.length === 0}
        />
      </div>

      {/* Tools Sidebar / Drawer (Right Side) */}
      <ContextSidebar 
          isVisible={showToolSelector}
          onClose={() => setShowToolSelector(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          enabledTools={enabledTools}
          toggleTool={toggleTool}
          attachedFiles={attachedFiles}
          onAttachToggle={handleAttachToggle}
          conversationId={conversation.id}
          availableTools={availableTools}
          setAvailableTools={setAvailableTools}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenFiles={openFiles}
          activeBrowserSessionId={activeBrowserSessionId}
          setActiveBrowserSessionId={setActiveBrowserSessionId}
          browserState={browserState}
      />

      {/* File Preview Modal */}
      {previewFile && (
          <FilePreviewModal 
              file={previewFile}
              onClose={() => setPreviewFile(null)}
              previewUrl={previewUrl}
              previewContent={previewContent}
              previewLoading={previewLoading}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              onSave={async (newContent) => {
                  await updateFileContent(previewFile.id, newContent);
                  setPreviewContent(newContent);
                  setIsEditing(false);
                  
                  // Update local state
                  setAllFiles(prev => prev.map(f => f.id === previewFile.id ? {...f, content: newContent} : f));
              }}
          />
      )}
    </div>
  );
}
