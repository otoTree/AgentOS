import { AppWindow, Code, Box, Settings } from 'lucide-react';
import { tryParseJson } from './utils';

interface WorkbenchPreviewProps {
  toolName: string;
  result: string;
}

export function WorkbenchPreview({ toolName, result }: WorkbenchPreviewProps) {
  const data = tryParseJson(result);

  if (!data) return <pre className="text-xs text-zinc-500">{result}</pre>;

  // List Projects
  if (Array.isArray(data)) {
      if (data.length === 0) return <div className="text-zinc-400 text-xs">No projects found.</div>;
      
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {data.map((p: any) => (
                  <div key={p.id} className="p-3 bg-white border border-zinc-100 rounded-lg shadow-sm hover:border-indigo-200 transition-all group">
                      <div className="flex items-start justify-between mb-2">
                          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                              <AppWindow className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] text-zinc-400">
                              {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                      </div>
                      <h4 className="font-medium text-sm text-zinc-800 mb-1">{p.name}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-2">{p.description || "No description"}</p>
                  </div>
              ))}
          </div>
      );
  }

  // Get Project
  if (toolName === 'workbench_get_project') {
      return (
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                  <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <AppWindow className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-semibold text-zinc-900">{data.name}</h3>
                          <p className="text-xs text-zinc-500">{data.description || "Project Workbench"}</p>
                      </div>
                  </div>
              </div>
              
              {data.tools && data.tools.length > 0 && (
                  <div className="p-4">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold mb-3">
                          Project Tools
                      </div>
                      <div className="space-y-2">
                          {data.tools.map((t: any) => (
                              <div key={t.id} className="flex items-center gap-3 p-2 rounded-md bg-zinc-50 border border-zinc-100">
                                  <Code className="w-4 h-4 text-zinc-500" />
                                  <div className="flex flex-col">
                                      <span className="text-xs font-medium text-zinc-700">{t.name}</span>
                                      <span className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                          {t.description || "Serverless Function"}
                                      </span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // Create Project / Tool Result
  if (data.message || data.id) {
      return (
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium bg-indigo-50 px-3 py-2 rounded-md border border-indigo-100 w-fit">
              <Box className="w-4 h-4" />
              {data.message || `Operation successful on ${data.name}`}
          </div>
      );
  }

  return (
    <div className="bg-zinc-50 p-2 rounded text-xs font-mono text-zinc-600 overflow-x-auto">
        <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
