
import { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface ToolCallCardProps {
  toolName: string;
  args?: any;
  result?: string;
  status: 'calling' | 'success' | 'error';
  isExpanded?: boolean;
}

export function ToolCallCard({ toolName, args, result, status, isExpanded: initialExpanded = false }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
  };

  return (
    <div className="flex justify-start w-full my-2">
      <div className={`max-w-[90%] w-full rounded-lg border overflow-hidden shadow-sm transition-all duration-200 ${
        status === 'calling' ? 'border-blue-500/20' : 
        status === 'success' ? 'border-green-500/20' : 
        'border-red-500/20'
      }`}>
        {/* Header */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-between p-3 transition-colors hover:bg-muted/50 ${getStatusColor()}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-background/50 backdrop-blur-sm border shadow-sm">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-xs flex items-center gap-2">
                {toolName}
                {getStatusIcon()}
              </span>
              <span className="text-[10px] opacity-80 font-mono mt-0.5">
                {status === 'calling' ? 'Executing...' : status === 'success' ? 'Completed' : 'Failed'}
              </span>
            </div>
          </div>
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        
        {/* Content */}
        {isExpanded && (
          <div className="bg-background/50 backdrop-blur-sm divide-y divide-border/50">
            {/* Arguments Section */}
            {args && Object.keys(args).length > 0 && (
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                  <span>Input Arguments</span>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5 font-mono text-xs overflow-x-auto border border-border/50">
                  <pre className="whitespace-pre-wrap break-all text-foreground/90">
                    {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result Section */}
            {result && (
              <div className="p-3">
                 <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                  <span>Execution Result</span>
                </div>
                <div className="bg-muted/50 rounded-md p-2.5 font-mono text-xs overflow-x-auto max-h-60 border border-border/50">
                  <pre className="whitespace-pre-wrap break-all text-foreground/90">
                    {result}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
