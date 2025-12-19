import { Table, FileSpreadsheet, Layers, Database } from 'lucide-react';
import { tryParseJson } from './utils';

interface TablePreviewProps {
  toolName: string;
  result: string;
}

export function TablePreview({ toolName, result }: TablePreviewProps) {
  const data = tryParseJson(result);

  if (!data) return <pre className="text-xs text-zinc-500">{result}</pre>;
  
  // Handle array (list workbooks)
  if (Array.isArray(data)) {
      if (data.length === 0) return <div className="text-zinc-400 text-xs">No workbooks found.</div>;
      
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {data.map((wb: any) => (
                  <div key={wb.id} className="flex items-center gap-3 p-3 bg-white border border-zinc-100 rounded-lg shadow-sm hover:border-green-200 transition-all group">
                      <div className="p-2 bg-green-50 rounded-md text-green-600 group-hover:bg-green-100 transition-colors">
                          <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-zinc-800 truncate">{wb.name}</span>
                          <span className="text-[10px] text-zinc-400">Last modified: {new Date(wb.lastModified).toLocaleDateString()}</span>
                      </div>
                  </div>
              ))}
          </div>
      );
  }

  // Handle object (get workbook summary or full workbook)
  if (toolName === 'excel_get_workbook' && data.sheets) {
      // Find active sheet data if available
      const activeSheet = data.sheets.find((s: any) => s.id === data.activeSheetId) || data.sheets[0];
      const hasData = activeSheet && activeSheet.data && activeSheet.data.length > 0;

      return (
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm text-zinc-800">{data.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                      {data.sheets.length} Sheets
                  </div>
              </div>

              {/* Data Preview Grid */}
              {hasData ? (
                  <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-xs text-left border-collapse">
                          <thead>
                              <tr className="bg-zinc-50/50 sticky top-0 z-10">
                                  <th className="w-8 p-1 border-b border-r border-zinc-100 bg-zinc-50"></th>
                                  {Array.from({ length: Math.min(activeSheet.data[0]?.length || 5, 10) }).map((_, i) => (
                                      <th key={i} className="p-1.5 font-medium text-zinc-500 border-b border-r border-zinc-100 bg-zinc-50 min-w-[60px] text-center">
                                          {String.fromCharCode(65 + i)}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody>
                              {activeSheet.data.slice(0, 20).map((row: any[], rIndex: number) => (
                                  <tr key={rIndex} className="hover:bg-blue-50/10">
                                      <td className="p-1.5 font-medium text-zinc-400 border-b border-r border-zinc-100 bg-zinc-50 text-center w-8">
                                          {rIndex + 1}
                                      </td>
                                      {row.slice(0, 10).map((cell: any, cIndex: number) => (
                                          <td key={cIndex} className="p-1.5 border-b border-r border-zinc-100 text-zinc-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                              {cell !== null && cell !== undefined ? String(cell) : ''}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {activeSheet.data.length > 20 && (
                          <div className="p-2 text-center text-[10px] text-zinc-400 bg-zinc-50 border-t border-zinc-100">
                              Showing first 20 rows of {activeSheet.data.length}
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="p-8 text-center text-zinc-400 text-xs italic">
                      No data in {activeSheet?.name || 'this sheet'}
                  </div>
              )}

              {/* Sheet Tabs Footer */}
              <div className="flex items-center gap-1 p-1 bg-zinc-100 border-t border-zinc-200 overflow-x-auto">
                  {data.sheets.map((s: any) => (
                      <div 
                        key={s.id} 
                        className={`px-3 py-1 rounded-t-sm text-[10px] font-medium cursor-default whitespace-nowrap flex items-center gap-1.5 ${s.id === activeSheet?.id ? 'bg-white text-green-700 shadow-sm' : 'text-zinc-500 hover:bg-zinc-200/50'}`}
                      >
                          <Layers className="w-3 h-3 opacity-50" />
                          {s.name}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  // Handle batch updates
  if (toolName === 'excel_batch_set_cell_values' && data.updates) {
      return (
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm text-zinc-800">{data.message}</span>
                  </div>
                  {data.sheetName && (
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Layers className="w-3 h-3 opacity-50" />
                          {data.sheetName}
                      </div>
                  )}
              </div>
              <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs text-left border-collapse">
                      <thead>
                          <tr className="bg-zinc-50/50 sticky top-0 z-10">
                              <th className="p-2 font-medium text-zinc-500 border-b border-r border-zinc-100 bg-zinc-50 w-16 text-center">Row</th>
                              <th className="p-2 font-medium text-zinc-500 border-b border-r border-zinc-100 bg-zinc-50 w-16 text-center">Col</th>
                              <th className="p-2 font-medium text-zinc-500 border-b border-r border-zinc-100 bg-zinc-50">New Value</th>
                          </tr>
                      </thead>
                      <tbody>
                          {data.updates.map((update: any, i: number) => (
                              <tr key={i} className="hover:bg-blue-50/10">
                                  <td className="p-2 border-b border-r border-zinc-100 text-zinc-500 text-center">{update.row + 1}</td>
                                  <td className="p-2 border-b border-r border-zinc-100 text-zinc-500 text-center">{String.fromCharCode(65 + update.col)}</td>
                                  <td className="p-2 border-b border-r border-zinc-100 text-zinc-700 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">{String(update.value)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  // Fallback
  return (
    <div className="bg-zinc-50 p-2 rounded text-xs font-mono text-zinc-600 overflow-x-auto">
        <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
