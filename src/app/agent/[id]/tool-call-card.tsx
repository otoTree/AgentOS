
import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/infra/utils';
import { EmailPreview } from './tool-previews/email-preview';
import { FilePreview } from './tool-previews/file-preview';
import { TablePreview } from './tool-previews/table-preview';
import { BrowserPreview } from './tool-previews/browser-preview';
import { WorkbenchPreview } from './tool-previews/workbench-preview';

interface ToolCallCardProps {
  toolName: string;
  args?: any;
  result?: string;
  status: 'calling' | 'success' | 'error';
  isExpanded?: boolean;
}

export function ToolCallCard({ toolName, args, result, status, isExpanded: initialExpanded = false }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />;
    }
  };

  const renderResultContent = () => {
    if (!result) return null;

    // If strictly an error status with no structured result, show raw text
    if (status === 'error') {
       return (
         <pre className="whitespace-pre-wrap break-all text-red-700">
           {result}
         </pre>
       );
    }

    // Default generic view (JSON/Text)
    return (
      <pre className="whitespace-pre-wrap break-all text-zinc-700">
        {result}
      </pre>
    );
  };

  const renderPreview = () => {
    if (!result || status !== 'success') return null;

    try {
      if (toolName.startsWith('email_')) {
        return <EmailPreview toolName={toolName} result={result} />;
      }
      if (toolName.startsWith('fs_')) {
        return <FilePreview toolName={toolName} result={result} />;
      }
      if (toolName.startsWith('excel_')) {
        return <TablePreview toolName={toolName} result={result} />;
      }
      if (toolName.startsWith('browser_')) {
        return <BrowserPreview toolName={toolName} result={result} />;
      }
      if (toolName.startsWith('workbench_')) {
        return <WorkbenchPreview toolName={toolName} result={result} />;
      }
    } catch (e) {
      console.error("Preview render failed", e);
    }
    return null;
  };

  const previewContent = renderPreview();

  return (
    <div className="flex flex-col items-start w-full my-2 font-sans gap-2">
      <div className={cn(
        "max-w-[90%] w-full rounded-xl border bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 overflow-hidden",
        status === 'calling' ? "border-zinc-200" :
        status === 'success' ? "border-zinc-200" :
        "border-red-200"
      )}>
        {/* Header */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-zinc-50/50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg border shadow-sm transition-colors",
              status === 'calling' ? "bg-zinc-50 border-zinc-200" :
              status === 'success' ? "bg-emerald-50/50 border-emerald-100" :
              "bg-red-50/50 border-red-100"
            )}>
              <Terminal className={cn(
                "w-3.5 h-3.5",
                status === 'calling' ? "text-zinc-500" :
                status === 'success' ? "text-emerald-600" :
                "text-red-600"
              )} />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                {toolName}
              </span>
              <div className="flex items-center gap-1.5">
                {getStatusIcon()}
                <span className="text-[11px] text-zinc-500 font-medium">
                  {status === 'calling' ? 'Executing...' : status === 'success' ? 'Completed' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-zinc-400 group-hover:text-zinc-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        
        {/* Content (Arguments & Raw Result) */}
        {isExpanded && (
          <div className="border-t border-zinc-100 bg-zinc-50/30 divide-y divide-zinc-100">
            {/* Arguments Section */}
            {args && Object.keys(args).length > 0 && (
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 pl-1">
                  Input Arguments
                </div>
                <div className="bg-white rounded-lg border border-zinc-200 p-3 font-mono text-xs overflow-x-auto shadow-sm">
                  <pre className="whitespace-pre-wrap break-all text-zinc-700">
                    {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result Section (Raw) */}
            {result && (
              <div className="p-3">
                 <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-2 pl-1">
                  Raw Output
                </div>
                <div className={cn(
                  "rounded-lg border p-3 text-xs overflow-x-auto max-h-[400px] shadow-sm bg-white",
                  status === 'error' ? "border-red-200 bg-red-50/30" : "border-zinc-200"
                )}>
                  {renderResultContent()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Standalone Preview Card */}
      {previewContent && (
        <div className="w-full max-w-[90%] animate-in fade-in slide-in-from-top-2 duration-300">
            {previewContent}
        </div>
      )}
    </div>
  );
}
