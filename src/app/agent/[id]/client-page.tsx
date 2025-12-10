'use client';

import { useState, useRef, useEffect } from 'react';
import { sendMessage, addToolToConversation, removeToolFromConversation, getPublicTools, deleteConversation, uploadAgentFile, removeFileFromConversation, addFileToConversation, getFiles, getFolders, updateFileContent } from '../actions';
import { WindowManager, ActiveWindow } from './window-manager';
import { WindowMode } from '@/components/ui/window-container';
import { Folder, Mail, Globe, AppWindow } from 'lucide-react';
import { FileEditor } from '@/app/dashboard/files/file-editor';
import { getDownloadUrl } from '@/app/dashboard/files/actions';
import ReactMarkdown from 'react-markdown';
import { useRouter, usePathname } from 'next/navigation';
import { ContextManager } from './context-manager';
import { Browser } from './browser';
import { ToolCallCard } from './tool-call-card';

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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState(conversation.messages || []);
  const [enabledTools, setEnabledTools] = useState(conversation.tools?.map((t: any) => t.tool) || []);
  const [attachedFiles, setAttachedFiles] = useState(conversation.files?.map((f: any) => f.file) || []);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'enabled' | 'marketplace' | 'files' | 'browser'>('marketplace');
  const [isUploading, setIsUploading] = useState(false);
  
  const SUGGESTED_PROMPTS = [
      "Write a Python crawler script",
      "Explain the principles of quantum computing",
      "Help me debug this code",
      "Create a marketing plan for a coffee shop",
      "Analyze current market trends"
  ];
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  
  // Windows State
  const [windows, setWindows] = useState<ActiveWindow[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processedCallIds = useRef<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

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
  const [activeBrowserSessionId, setActiveBrowserSessionId] = useState<string | null>(conversation.browserSessionId || null);
  const [browserState, setBrowserState] = useState<{url?: string, screenshot?: string, sessionId?: string} | null>(
      conversation.browserSessionId ? {
          sessionId: conversation.browserSessionId,
          url: conversation.browserUrl || undefined,
          screenshot: conversation.browserScreenshot || undefined
      } : null
  );

  const openWindow = (type: ActiveWindow['type'], data?: any) => {
      // Check if already open
      const existing = windows.find(w => w.type === type && (type !== 'editor' || w.data?.id === data?.id));
      if (existing) {
          // Bring to front or highlight?
          return;
      }

      const id = Date.now().toString();
      setWindows(prev => [...prev, {
          id,
          type,
          title: type === 'file-browser' ? 'Files' : type === 'workbench' ? 'Workbench' : (data?.name || 'Editor'),
          mode: 'floating',
          data
      }]);
  };

  const closeWindow = (id: string) => {
      setWindows(prev => prev.filter(w => w.id !== id));
  };

  const updateWindowMode = (id: string, mode: WindowMode) => {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, mode } : w));
  };
  
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
          } catch (e) {}
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
                      setMessages((prev: any[]) => {
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
                          // Note: Checking for "newer" is hard without timestamp, but we can assume server is truth.
                          // However, we might have local optimistic state.
                          // Ideally we trust server if it has content.
                          setBrowserState(prev => {
                              // If server has same data, don't update to avoid re-renders?
                              // Actually React handles object equality checks if references differ but content same? No.
                              // Let's just update.
                              return {
                                  sessionId: data.browserSessionId,
                                  url: data.browserUrl || undefined,
                                  screenshot: data.browserScreenshot || undefined
                              };
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
              } catch (e) {}
          }
      });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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
    const userMessage = { role: 'user', content: contentToSend, id: 'temp-' + Date.now() };
    setMessages((prev: any) => [...prev, userMessage]);
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
      alert("Failed to send message");
      setIsLoading(false);
    } 
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

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
        } catch(e) {}
        
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
                // We don't have the full file object here easily without fetching, 
                // but ContextManager has it. 
                // Ideally we should just refresh or trust the poll.
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
      const [files, folders] = await Promise.all([
          getFiles("", folderId),
          getFolders(folderId)
      ]);
      setAllFiles(files);
      setAllFolders(folders);
      setCurrentFolderId(folderId);
  };

  const navigateToFolder = async (folderId: string | null, folderName: string) => {
      await loadFiles(folderId);
      
      if (folderId === null) {
          setFolderPath([{id: null, name: 'Root'}]);
      } else {
          // Simple navigation: append if going deeper, truncate if going back (not implemented fully here for simplicity, just append or reset)
          // For proper breadcrumbs, we'd need the full path from server or recursive lookups.
          // Here we just handle "Root" -> "Selected Folder"
          setFolderPath(prev => {
             const index = prev.findIndex(p => p.id === folderId);
             if (index >= 0) return prev.slice(0, index + 1);
             return [...prev, {id: folderId, name: folderName}];
          });
      }
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
          alert("Failed to upload file");
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleRemoveFile = async (fileId: string) => {
      if (confirm("Remove this file from conversation?")) {
          await removeFileFromConversation(conversation.id, fileId);
          setAttachedFiles((prev: any[]) => prev.filter((f: any) => f.id !== fileId));
          router.refresh();
      }
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-card/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
            <div>
                <h1 className="font-semibold">{conversation.title}</h1>
                <p className="text-xs text-muted-foreground">{enabledTools.length} tools enabled</p>
            </div>
            <div className="flex gap-2">
                 <button
                    onClick={() => openWindow('file-browser')}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Files"
                 >
                    <Folder className="w-4 h-4" />
                 </button>
                 <button
                    onClick={() => openWindow('email')}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Email"
                 >
                    <Mail className="w-4 h-4" />
                 </button>
                 <button
                    onClick={() => openWindow('browser', { sessionId: activeBrowserSessionId, state: browserState })}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Browser"
                 >
                    <Globe className="w-4 h-4" />
                 </button>
                 <button
                    onClick={() => openWindow('workbench')}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                    title="Workbench"
                 >
                    <AppWindow className="w-4 h-4" />
                 </button>
                 <div className="w-px h-4 bg-border mx-1 self-center" />
                 <button
                    onClick={loadTools}
                    className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                 >
                    Manage Context
                 </button>
                 <button
                    onClick={handleDelete}
                    className="text-xs px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                 >
                    Delete
                 </button>
            </div>
        </div>

        {/* Windows Manager */}
        <div className="absolute top-16 left-0 right-0 z-30 px-4 pointer-events-none">
             <div className="pointer-events-auto">
                 <WindowManager 
                    windows={windows}
                    onUpdateMode={updateWindowMode}
                    onClose={closeWindow}
                    onOpenWindow={openWindow}
                 />
             </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4">
            <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-20">
                    <p>Start chatting with the agent.</p>
                    <p className="text-sm mt-2">Enable tools to give it capabilities.</p>
                </div>
            )}
            
            {(() => {
                // Pre-process messages to group tool interactions
                const renderedItems: JSX.Element[] = [];
                
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    let handled = false;

                    try {
                        if (msg.role === 'assistant' || msg.role === 'system') {
                            const parsed = JSON.parse(msg.content);
                            
                            if (parsed.type === 'tool_call') {
                                handled = true;
                                const toolName = parsed.tool;
                                const toolArgs = parsed.args;
                                let result = null;

                                // Look ahead for result
                                // Simple heuristic: next message is system tool_result with same tool name
                                if (i + 1 < messages.length) {
                                    const nextMsg = messages[i + 1];
                                    try {
                                        const nextParsed = JSON.parse(nextMsg.content);
                                        if (nextParsed.type === 'tool_result' && nextParsed.tool === toolName) {
                                            result = nextParsed.output;
                                            i++; // Skip next message
                                        }
                                    } catch (e) {}
                                }

                                renderedItems.push(
                                    <ToolCallCard
                                        key={msg.id}
                                        toolName={toolName}
                                        args={toolArgs}
                                        result={result}
                                        status={result ? 'success' : 'calling'}
                                    />
                                );
                            } else if (parsed.type === 'tool_plan') {
                                handled = true;
                                renderedItems.push(
                                    <div key={msg.id} className="flex justify-start">
                                        <div className="max-w-[80%] rounded-lg p-4 bg-muted/50 border">
                                            <div className="prose dark:prose-invert text-sm max-w-none break-words">
                                                <ReactMarkdown>{parsed.thought || ''}</ReactMarkdown>
                                            </div>
                                            <div className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{msg.role}</div>
                                        </div>
                                    </div>
                                );
                            } else if (parsed.type === 'tool_result') {
                                // Orphan result? Should be handled by lookahead, but just in case
                                handled = true;
                                renderedItems.push(
                                    <div key={msg.id} className="flex justify-start w-full my-2">
                                        <div className="max-w-[90%] w-full rounded-lg p-2 bg-red-500/10 border border-red-500/20">
                                            <div className="text-xs text-red-600 font-medium mb-1">Orphan Tool Result ({parsed.tool})</div>
                                            <div className="bg-muted p-2 rounded font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto border">
                                                {parsed.output}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        }
                    } catch (e) {
                        // Not JSON
                    }

                    if (!handled) {
                        // Parse out file attachments from content
                        // Format: [File: name](url)
                        const fileRegex = /\[File:\s*(.*?)\]\((.*?)\)/g;
                        const attachments: { name: string, url: string }[] = [];
                        let cleanContent = msg.content;
                        
                        let match;
                        while ((match = fileRegex.exec(msg.content)) !== null) {
                            attachments.push({ name: match[1], url: match[2] });
                        }

                        // Remove the links from the display content
                        cleanContent = cleanContent.replace(fileRegex, '').trim();

                        renderedItems.push(
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] rounded-lg p-4 ${
                                        msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : msg.role === 'system'
                                        ? 'bg-muted text-xs font-mono whitespace-pre-wrap'
                                        : 'bg-muted/50 border'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="prose dark:prose-invert text-sm max-w-none break-words">
                                            <ReactMarkdown>{cleanContent || ''}</ReactMarkdown>
                                        </div>
                                    ) : (
                                         <div className="text-sm whitespace-pre-wrap break-words">{cleanContent}</div>
                                    )}

                                    {/* Attachments Display */}
                                    {attachments.length > 0 && (
                                        <div className={`mt-3 flex flex-wrap gap-2 ${msg.role === 'user' ? '' : 'pt-2 border-t'}`}>
                                            {attachments.map((att, idx) => (
                                                <a
                                                    key={idx}
                                                    href={att.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded border transition-colors ${
                                                        msg.role === 'user'
                                                        ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20 border-white/20'
                                                        : 'bg-background hover:bg-muted'
                                                    }`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                                        <polyline points="14 2 14 8 20 8"/>
                                                    </svg>
                                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{msg.role}</div>
                                </div>
                            </div>
                        );
                    }
                }
                
                return renderedItems;
            })()}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-muted/50 border rounded-lg p-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-background">
            <div className="max-w-2xl  mx-auto space-y-4">
                {/* Suggested Prompts */}
                {messages.length === 0 && (
                   <div className="flex flex-wrap gap-2 justify-center pb-2">
                       {SUGGESTED_PROMPTS.map((prompt, i) => (
                           <button
                               key={i}
                               type="button"
                               onClick={() => setInput(prompt)}
                               className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors border"
                           >
                               {prompt}
                           </button>
                       ))}
                   </div>
                )}

                <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2 w-full items-end">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="p-3 text-muted-foreground hover:text-foreground bg-muted/50 rounded-2xl transition-colors disabled:opacity-50"
                    title="Upload file"
                >
                    {isUploading ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                    )}
                </button>

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted/50 border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none min-h-[48px] max-h-[120px] resize-none overflow-y-auto"
                    disabled={isLoading}
                    rows={1}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed h-[48px]"
                >
                    Send
                </button>
            </form>
            </div>
        </div>
      </div>

      {/* Tools Sidebar / Drawer (Right Side) */}
      {showToolSelector && (
          <div className="w-1/2 border-l bg-background p-4 flex flex-col h-full absolute right-0 top-0 bottom-0 shadow-2xl z-20 md:relative md:shadow-none">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Manage Context</h3>
                  <button onClick={() => setShowToolSelector(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
              </div>

              {/* Tabs */}
              <div className="flex mb-4 border rounded-md overflow-hidden bg-muted/50">
                  <button
                      onClick={() => setActiveTab('enabled')}
                      className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'enabled' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                      Tools ({enabledTools.length})
                  </button>
                  <button
                      onClick={openFiles}
                      className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'files' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                      Files ({attachedFiles.length})
                  </button>
                  <button
                      onClick={() => setActiveTab('browser')}
                      className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'browser' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                      Browser
                  </button>
                  <button
                      onClick={async () => {
                          setActiveTab('marketplace');
                          if (availableTools.length === 0) {
                              const tools = await getPublicTools();
                              if (tools) setAvailableTools(tools);
                          }
                      }}
                      className={`flex-1 px-2 py-2 text-xs font-medium text-center transition-colors ${activeTab === 'marketplace' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
                  >
                      Market
                  </button>
              </div>

              {activeTab === 'marketplace' && (
                  <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search marketplace..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                  </div>
              )}
              
              <div className="flex-1 overflow-y-auto space-y-4">
                  {activeTab === 'enabled' && (
                      <div className="space-y-2">
                          {enabledTools.length === 0 ? (
                              <div className="text-center text-muted-foreground text-xs py-8">
                                  No tools enabled yet.
                              </div>
                          ) : (
                              enabledTools.map((tool: any) => (
                                  <div key={tool.id} className="p-3 rounded-lg border bg-card">
                                      <div className="flex items-start justify-between gap-2">
                                          <div>
                                              <h4 className="font-medium text-sm">{tool.name}</h4>
                                              <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                                          </div>
                                          <button
                                              onClick={() => toggleTool(tool.id)}
                                              className="text-xs px-2 py-1 rounded-md border shrink-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                          >
                                              Disable
                                          </button>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  )}

                  {activeTab === 'files' && (
                      <ContextManager 
                        conversationId={conversation.id}
                        attachedFileIds={attachedFiles.map((f: any) => f.id)}
                        onAttachToggle={handleAttachToggle}
                      />
                  )}
                  
                  {activeTab === 'browser' && (
                    <Browser 
                        onSessionChange={setActiveBrowserSessionId} 
                        externalSessionId={activeBrowserSessionId}
                        initialState={browserState}
                    />
                  )}

                  {/* File Preview Modal */}
                   {previewFile && (
                     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
                        <div className="bg-background rounded-lg shadow-lg w-[90vw] h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                             <div className="flex items-center justify-between p-4 border-b">
                                 <div className="flex items-center gap-4">
                                     <h3 className="font-semibold truncate max-w-[400px]">{previewFile.name}</h3>
                                     {!previewLoading && previewContent !== null && (
                                        <div className="flex bg-muted rounded-lg p-1">
                                            <button 
                                                onClick={() => setIsEditing(false)}
                                                className={`px-3 py-1 text-xs font-medium rounded ${!isEditing ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Preview
                                            </button>
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className={`px-3 py-1 text-xs font-medium rounded ${isEditing ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                     )}
                                 </div>
                                 <button 
                                     onClick={() => setPreviewFile(null)}
                                     className="text-muted-foreground hover:text-foreground"
                                 >
                                     Close
                                 </button>
                             </div>
                             
                             <div className="flex-1 bg-muted/10 overflow-hidden flex flex-col relative">
                                 {previewLoading ? (
                                     <div className="flex items-center justify-center h-full">
                                         <div className="animate-pulse">Loading...</div>
                                     </div>
                                 ) : !previewUrl ? (
                                     <div className="flex items-center justify-center h-full">
                                         <div className="text-destructive">Failed to load file</div>
                                     </div>
                                 ) : isEditing && previewContent !== null ? (
                                     <FileEditor
                                         file={previewFile}
                                         initialContent={previewContent}
                                         onSave={async (newContent) => {
                                             await updateFileContent(previewFile.id, newContent);
                                             setPreviewContent(newContent);
                                             setIsEditing(false);
                                             
                                             // Update local state
                                             setAllFiles(prev => prev.map(f => f.id === previewFile.id ? {...f, content: newContent} : f));
                                         }}
                                     />
                                 ) : (
                                     <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                                         {previewFile.mimeType.startsWith("image/") ? (
                                             <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                                         ) : previewFile.mimeType === "application/pdf" ? (
                                             <iframe src={previewUrl} className="w-full h-full border-none" />
                                         ) : previewContent !== null ? (
                                             <div className="w-full h-full overflow-auto bg-white dark:bg-slate-950 p-4 rounded shadow-sm border">
                                                 <pre className="text-sm font-mono whitespace-pre-wrap break-words text-foreground">
                                                     {previewContent}
                                                 </pre>
                                             </div>
                                         ) : (
                                             <div className="text-center">
                                                 <p className="mb-4">Preview not available for this file type.</p>
                                                 <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                     Download to view
                                                 </a>
                                             </div>
                                         )}
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                   )}

                  {activeTab === 'marketplace' && (
                      // Marketplace Tab
                      (() => {
                          const filtered = availableTools.filter(t =>
                              t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              t.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
                          );

                          // Grouping
                          const groups: Record<string, any[]> = {};
                          filtered.forEach(t => {
                              const pname = t.projectName || 'Unknown Project';
                              if (!groups[pname]) groups[pname] = [];
                              groups[pname].push(t);
                          });

                          if (filtered.length === 0) {
                              return (
                                  <div className="text-center text-muted-foreground text-sm py-4">
                                      No matching tools found.
                                  </div>
                              );
                          }

                          return Object.entries(groups).map(([project, tools]) => (
                              <div key={project} className="space-y-2">
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{project}</h4>
                                  <div className="space-y-2">
                                      {tools.map(tool => {
                                          const isEnabled = enabledTools.some((t: any) => t.id === tool.id);
                                          return (
                                              <div key={tool.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                                  <div className="flex items-start justify-between gap-2">
                                                      <div>
                                                          <h4 className="font-medium text-sm">{tool.name}</h4>
                                                          <p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p>
                                                      </div>
                                                      <button
                                                          onClick={() => toggleTool(tool.id)}
                                                          className={`text-xs px-2 py-1 rounded-md border shrink-0 ${
                                                              isEnabled
                                                              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                                          }`}
                                                      >
                                                          {isEnabled ? 'Enabled' : 'Enable'}
                                                      </button>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          ));
                      })()
                  )}
              </div>
          </div>
      )}
    </div>
  );
}