'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, RotateCw, ArrowLeft, ArrowRight, X, Square, Code, Eye, Maximize2, Minimize2, Plus, Copy } from 'lucide-react';

interface BrowserProps {
  initialUrl?: string;
  onSessionChange?: (sessionId: string | null) => void;
  externalSessionId?: string | null;
  refreshTrigger?: number;
  initialState?: { url?: string, screenshot?: string, sessionId?: string } | null;
}

interface Tab {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

// Use the sandbox URL from environment variable or default
const SANDBOX_API_URL = process.env.NEXT_PUBLIC_SANDBOX_API_URL || "http://sandbox-gupxspgugged.ns-3kjgtco0.svc.cluster.local:8080";
// The browser session API endpoints
const SESSIONS_API = `${SANDBOX_API_URL}/browser/sessions`;
const CONTENT_API = `/api/browser/content`;

export function Browser({ initialUrl = 'https://www.baidu.com', onSessionChange, externalSessionId, refreshTrigger, initialState }: BrowserProps) {
  const [sessionId, setSessionId] = useState<string | null>(initialState?.sessionId || null);
  const [url, setUrl] = useState(initialState?.url || initialUrl);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Notify parent of session changes
  useEffect(() => {
    if (onSessionChange) {
      onSessionChange(sessionId);
    }
  }, [sessionId, onSessionChange]);

  const [inputUrl, setInputUrl] = useState(initialState?.url || initialUrl);
  const [screenshot, setScreenshot] = useState<string | null>(initialState?.screenshot || null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  // React to initialState changes (from parent)
  useEffect(() => {
      if (initialState) {
          if (initialState.sessionId && initialState.sessionId !== sessionId) {
              setSessionId(initialState.sessionId);
          }
          if (initialState.url) {
              setUrl(initialState.url);
              setInputUrl(initialState.url);
          }
          if (initialState.screenshot) {
              setScreenshot(initialState.screenshot);
          }
      }
  }, [initialState]);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const imageRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Sync ref
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Handle fullscreen changes
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Initialize session on mount
  useEffect(() => {
    if (externalSessionId) {
        setSessionId(externalSessionId);
        // We can't easily refresh the view without an action, but let's try to take a screenshot to sync state
        // We need to defer this slightly to ensure sessionId state is set? 
        // Actually handleAction uses state 'sessionId', so we can't call it immediately if we just set it.
        // But we can call the API directly or use a separate effect.
        return;
    }

    createSession();
    return () => {
      // Persist session across tab switches (do not destroy)
      // if (!externalSessionId && sessionIdRef.current) {
      //   destroySession(sessionIdRef.current);
      // }
      // if (onSessionChange) {
      //   onSessionChange(null);
      // }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSessionId]);

  // Fetch tabs when session changes
  useEffect(() => {
    if (sessionId) {
      fetchTabs(sessionId);
    }
  }, [sessionId]);

  // Refresh view when external session changes
  useEffect(() => {
      if (externalSessionId && sessionId === externalSessionId) {
          // Trigger a screenshot to update view
          handleAction('screenshot');
          
          // Try to sync URL
          fetch(`/api/browser/action`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                   sessionId, 
                   action: 'evaluate',
                   script: 'window.location.href',
                   tabId: activeTabId || undefined
               })
           }).then(res => res.json()).then(data => {
               if (data.result) {
                   setUrl(data.result);
                   setInputUrl(data.result);
               }
           }).catch(e => console.error("Failed to sync URL", e));

           fetchTabs(sessionId);
      }
  }, [externalSessionId, sessionId]);

  // Handle external refresh trigger
  useEffect(() => {
      // Only refresh if we DON'T have a recent state update from props (handled above)
      // Or if we specifically want to force a refresh.
      // With the new architecture, refreshTrigger might be redundant if client-page passes state.
      // But keeping it for backward compat or manual triggers.
      if (refreshTrigger && sessionId && !initialState?.screenshot) {
          handleAction('screenshot');
          // Sync URL
          fetch(`/api/browser/action`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                   sessionId, 
                   action: 'evaluate',
                   script: 'window.location.href',
                   tabId: activeTabId || undefined
               })
           }).then(res => res.json()).then(data => {
               if (data.result) {
                   setUrl(data.result);
                   setInputUrl(data.result);
               }
           }).catch(e => console.error("Failed to sync URL", e));
      }
  }, [refreshTrigger]);

  useEffect(() => {
    if (viewMode === 'code' && sessionId) {
        fetchPageContent(sessionId);
    }
  }, [viewMode, sessionId, url, activeTabId]);

  // Hotkey support for view switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setViewMode(prev => prev === 'visual' ? 'code' : 'visual');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchTabs = async (sid: string) => {
    // Simple throttle/debounce check
    const now = Date.now();
    // @ts-ignore
    if (now - (fetchTabs.lastCall || 0) < 1000) return;
    // @ts-ignore
    fetchTabs.lastCall = now;

    try {
      const res = await fetch(`/api/browser/tabs?sessionId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        setTabs(data);
        const active = data.find((t: Tab) => t.active);
        if (active) {
            setActiveTabId(active.id);
            setUrl(active.url);
            setInputUrl(active.url);
        }
      }
    } catch (err) {
      console.error("Failed to fetch tabs", err);
    }
  };

  const createSession = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/browser/session', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to create browser session');
      
      const data = await res.json();
      setSessionId(data.sessionId);
      
      if (initialUrl) {
        await navigate(data.sessionId, initialUrl);
      }
      
      // Fetch initial tabs
      await fetchTabs(data.sessionId);
    } catch (err) {
      console.error(err);
      setError('Failed to initialize browser session');
    } finally {
      setIsLoading(false);
    }
  };

  const createTab = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch('/api/browser/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (res.ok) {
        const data = await res.json();
        await fetchTabs(sessionId);
        setActiveTabId(data.tabId);
        // Navigate to default or blank
      }
    } catch (err) {
      console.error("Failed to create tab", err);
    }
  };

  const closeTab = async (tabId: string) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/browser/tabs/${tabId}?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      await fetchTabs(sessionId);
      if (activeTabId === tabId) {
          setActiveTabId(null); // Or select another one logic in fetchTabs or here
      }
    } catch (err) {
      console.error("Failed to close tab", err);
    }
  };

  const switchTab = async (tabId: string) => {
      setActiveTabId(tabId);
      // We might need to "activate" it on the server side too if the server tracks active tab state implicitly
      // But based on API docs, we just pass tabId to actions.
      // However, for "screenshot" of the active tab, we need to know which one.
      // The API docs for "Perform Action" says "tabId: Target tab ID". 
      // So we should pass it.
      
      // We should also update the URL bar to the selected tab's URL
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
          setUrl(tab.url);
          setInputUrl(tab.url);
      }
      
      // Refresh screenshot for this tab
      handleAction('screenshot', {}, tabId);
  };

  const fetchPageContent = async (sid: string) => {
    try {
        let url = `${CONTENT_API}?sessionId=${sid}`;
        if (activeTabId) url += `&tabId=${activeTabId}`;
        
        const res = await fetch(url);
        if (res.ok) {
            const html = await res.text();
            setHtmlContent(html);
        }
    } catch (err) {
        console.error("Failed to fetch page content", err);
    }
  };

  const destroySession = async (id: string) => {
    try {
      await fetch(`/api/browser/session?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  const navigate = async (id: string, targetUrl: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/browser/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, url: targetUrl, tabId: activeTabId || undefined })
      });
      
      if (!res.ok) throw new Error('Failed to navigate');
      
      const data = await res.json();
      setScreenshot(data.screenshot);
      setUrl(data.url);
      setInputUrl(data.url);
      
      // Update history
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(data.url);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
      
      // Update tabs list (title/url might change)
      fetchTabs(id);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load page');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, params: any = {}, targetTabId?: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    // Don't reset error on every action to prevent flickering, unless it's a major nav
    // setError(null); 
    
    try {
      const tid = targetTabId || activeTabId;
      const res = await fetch(`/api/browser/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          action, 
          tabId: tid,
          ...params 
        })
      });
      
      const data = await res.json();

      if (!res.ok) {
          // If 400 or other error, log it but don't crash the UI unless critical
          console.error("Action failed:", data);
          // Special handling for Tab not found - maybe it was closed?
          if (data.error && (data.error.includes("Tab") || data.error.includes("not found"))) {
              // Refresh tabs to see if our state is stale
               fetchTabs(sessionId);
          }
          throw new Error(data.error || 'Action failed');
      }
      
      if (data.screenshot) {
        setScreenshot(data.screenshot);
      }
      
      // If action might change URL or title, refresh tabs
      if (['click', 'press', 'type', 'evaluate', 'scroll'].includes(action)) {
          // Delay slightly or just call it
          fetchTabs(sessionId);
      }

    } catch (err: any) {
      console.error(err);
      // Only set visible error for critical actions or if user initiated
      // For background actions like periodic refresh, we might want to suppress
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !sessionId) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    handleAction('click', { x, y });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Only handle vertical scroll for now
    // Ideally we should debounce this
  };
  
  // Debounced scroll handler
  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !sessionId) return;

    let timeoutId: NodeJS.Timeout;

    const handleScrollEvent = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            // Calculate scroll amount or position
            // Since the image is a screenshot, we might need to send scroll action to server
            // But the current API implies we are viewing a viewport.
            // If the user scrolls on the image container, does it mean they want to scroll the page?
            // The screenshot is usually of the visible viewport.
            
            // Actually, for a "remote browser" experience:
            // 1. We display the screenshot.
            // 2. User interactions (click, scroll, keypress) are sent to server.
            // 3. Server updates page and returns new screenshot.
            
            // For scrolling:
            // If the screenshot is just the viewport, we can't "scroll" the image locally to see more.
            // We must send a scroll action.
            // A common pattern is to capture mouse wheel events on the image.
        }, 200);
    };
    
    // We'll attach wheel listener to the image container instead of using onScroll
    // because the container itself might not be scrollable if the image fits (it's just a viewport screenshot).
  }, [sessionId]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!sessionId) return;
    
    // Simple throttle for wheel events
    // We use a ref to store last call time
    const now = Date.now();
    // @ts-ignore
    if (now - (handleWheel.lastCall || 0) < 500) return;
    // @ts-ignore
    handleWheel.lastCall = now;

    const delta = e.deltaY;
    if (delta > 0) {
        handleAction('press', { value: 'PageDown' });
    } else {
        handleAction('press', { value: 'PageUp' });
    }
  }, [sessionId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!sessionId) return;
      // Capture typing
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          handleAction('type', { value: e.key });
      } else if (e.key === 'Enter') {
          handleAction('press', { value: 'Enter' });
      } else if (e.key === 'Backspace') {
          handleAction('press', { value: 'Backspace' });
      } else if (e.key === 'ArrowDown') {
          handleAction('press', { value: 'ArrowDown' });
      } else if (e.key === 'ArrowUp') {
          handleAction('press', { value: 'ArrowUp' });
      }
      // Add more keys as needed
  }, [sessionId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionId && inputUrl) {
      navigate(sessionId, inputUrl);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0 && sessionId) {
      const prevUrl = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      navigate(sessionId, prevUrl);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1 && sessionId) {
      const nextUrl = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      navigate(sessionId, nextUrl);
    }
  };

  const handleRefresh = () => {
    if (sessionId && url) {
      navigate(sessionId, url);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full border-l bg-background">
      {/* Browser Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <button 
            onClick={handleBack} 
            disabled={historyIndex <= 0 || isLoading}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleForward} 
            disabled={historyIndex >= history.length - 1 || isLoading}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter URL..."
          />
        </form>

        <div className="flex items-center border-l pl-2 ml-2">
            <button
                onClick={() => setViewMode(viewMode === 'visual' ? 'code' : 'visual')}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-2"
                title={viewMode === 'visual' ? "View Source (Ctrl+U)" : "View Visual"}
            >
                {viewMode === 'visual' ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-2 ml-1"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>
      </div>

      {/* Tab Bar */}
      {tabs.length > 0 && (
          <div className="flex items-center gap-1 p-1 bg-muted/20 border-b overflow-x-auto">
              {tabs.map(tab => (
                  <div 
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs border-b-2 cursor-pointer transition-colors min-w-[120px] max-w-[200px]
                        ${activeTabId === tab.id 
                            ? 'bg-background border-primary text-foreground font-medium shadow-sm' 
                            : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'}
                    `}
                  >
                      <span className="truncate flex-1" title={tab.title || tab.url || "New Tab"}>
                          {tab.title || "New Tab"}
                      </span>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                        }}
                        className="p-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
                          <X className="w-3 h-3" />
                      </button>
                  </div>
              ))}
              <button 
                onClick={createTab}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                title="New Tab"
              >
                  <Plus className="w-4 h-4" />
              </button>
          </div>
      )}

      {/* Browser Viewport */}
      <div 
        className="flex-1 overflow-auto bg-muted/10 relative flex items-center justify-center focus:outline-none"
        onWheel={handleWheel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {error ? (
          <div className="text-center p-8">
            <div className="text-destructive mb-2">Error</div>
            <p className="text-muted-foreground text-sm">{error}</p>
            <button 
              onClick={() => createSession()} 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Retry Session
            </button>
          </div>
        ) : viewMode === 'code' ? (
             <div className="w-full h-full bg-background overflow-auto p-4">
                 {htmlContent ? (
                     <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground">
                         {htmlContent}
                     </pre>
                 ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                         Loading source code...
                     </div>
                 )}
             </div>
        ) : screenshot ? (
          <div className="relative shadow-lg border bg-white select-none">
            <img 
              ref={imageRef}
              src={`data:image/png;base64,${screenshot}`} 
              alt="Browser Viewport"
              className="max-w-full max-h-full block cursor-crosshair"
              onClick={handleImageClick}
              draggable={false}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {isLoading ? (
              <>
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p>Loading browser...</p>
              </>
            ) : (
              <div className="text-center">
                <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Ready to browse</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground flex justify-between">
        <span>{sessionId ? 'Session Active' : 'No Session'}</span>
        <span>{url}</span>
      </div>
    </div>
  );
}
