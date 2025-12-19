import { Globe, MousePointer, Image as ImageIcon, ExternalLink, FileCode } from 'lucide-react';
import { tryParseJson } from './utils';
import { Browser } from '../browser';

interface BrowserPreviewProps {
  toolName: string;
  result: string;
}

export function BrowserPreview({ toolName, result }: BrowserPreviewProps) {
  // Special handling for source code view
  if (toolName === 'browser_source') {
      return (
          <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-700">Page Source</span>
                  <span className="text-[10px] text-zinc-400 ml-auto">
                      {result.length.toLocaleString()} chars
                  </span>
              </div>
              <div className="bg-zinc-50/50 p-0 overflow-auto max-h-[500px]">
                  <pre className="text-[10px] text-zinc-600 p-4 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {result}
                  </pre>
              </div>
          </div>
      );
  }

  const data = tryParseJson(result);

  if (!data) {
      return (
        <div className="w-full max-w-4xl bg-zinc-50 border border-zinc-200 rounded-lg shadow-sm overflow-hidden p-3">
            <pre className="text-xs text-zinc-500 whitespace-pre-wrap break-all">{result}</pre>
        </div>
      );
  }

  const { message, url, screenshot, sessionId } = data;

  return (
    <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        {/* Header Info */}
        <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex items-start gap-3">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md shrink-0">
                <Globe className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0 w-full">
                <div className="text-xs font-medium text-zinc-800 break-words mb-1">
                    {message}
                </div>
            </div>
        </div>

        {/* Browser Component Reuse */}
        <div className="h-[500px] w-full relative">
            {/* 
              We pass the session state directly to the Browser component.
              This allows it to connect to the same session and show the interactive view.
            */}
            <Browser 
                externalSessionId={sessionId}
                initialState={{
                    sessionId,
                    url,
                    screenshot
                }}
            />
        </div>
    </div>
  );
}
