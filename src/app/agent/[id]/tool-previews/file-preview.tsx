import { Folder, File, FileText, HardDrive, Download } from 'lucide-react';
import { tryParseJson } from './utils';
import { cn } from '@/lib/infra/utils';

interface FilePreviewProps {
  toolName: string;
  result: string;
}

export function FilePreview({ toolName, result }: FilePreviewProps) {
  const data = tryParseJson(result);

  if (!data || data.error) {
    return <div className="text-red-500 text-xs">{data?.error || result}</div>;
  }

  if (toolName === 'fs_list_files') {
    const { files, folders } = data;
    if (!files && !folders) return <pre className="text-xs">{result}</pre>;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {folders?.map((f: any) => (
          <div key={f.id} className="flex items-center gap-2 p-2 bg-zinc-50 border border-zinc-100 rounded-md text-zinc-700 text-xs hover:bg-zinc-100 transition-colors">
            <Folder className="w-4 h-4 text-blue-400 fill-blue-50" />
            <span className="font-medium truncate">{f.name}</span>
          </div>
        ))}
        {files?.map((f: any) => (
          <div key={f.id} className="flex items-center gap-2 p-2 bg-white border border-zinc-100 rounded-md text-zinc-600 text-xs hover:border-zinc-300 transition-colors">
            <File className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{f.name}</span>
                <span className="text-[10px] text-zinc-400">
                    {f.size ? `${(f.size / 1024).toFixed(1)} KB` : '0 KB'}
                </span>
            </div>
          </div>
        ))}
        {(!files?.length && !folders?.length) && (
            <div className="text-zinc-400 text-xs italic col-span-full text-center py-2">Empty directory</div>
        )}
      </div>
    );
  }

  if (toolName === 'fs_read_file') {
      const { name, content, size, url, mimeType } = data;
      
      // Determine file type icon and color
      const isImage = mimeType?.startsWith('image/') || name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i);
      const isPdf = mimeType === 'application/pdf' || name.match(/\.pdf$/i);
      
      return (
          <div className="w-full max-w-2xl border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="bg-zinc-50 px-3 py-2 border-b border-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-700">{name}</span>
                  <span className="text-[10px] text-zinc-400 ml-auto border-l border-zinc-200 pl-2">
                    {size ? `${(size / 1024).toFixed(1)} KB` : ''}
                  </span>
              </div>
              
              <div className="bg-white p-0 overflow-x-auto min-h-[100px] max-h-[500px] flex justify-center">
                {isImage && url ? (
                     <div className="p-4 w-full h-full flex items-center justify-center bg-zinc-50/30">
                        <img 
                            src={url} 
                            alt={name} 
                            className="max-w-full max-h-[400px] object-contain rounded shadow-sm border border-zinc-100" 
                        />
                     </div>
                ) : isPdf && url ? (
                    <iframe src={url} className="w-full h-[500px] border-none" />
                ) : (
                    <pre className="text-xs text-zinc-700 p-4 font-mono whitespace-pre leading-relaxed tab-4 w-full text-left">
                        {content}
                    </pre>
                )}
              </div>
          </div>
      );
  }

  if (toolName === 'fs_create_file') {
      const { message, file } = data;
      const { name, content, size, url, mimeType } = file || {};

      // Determine file type icon and color
      const isImage = mimeType?.startsWith('image/') || name?.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i);
      const isPdf = mimeType === 'application/pdf' || name?.match(/\.pdf$/i);

      return (
          <div className="w-full max-w-2xl border border-emerald-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
              <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-800">{message}: {name}</span>
                  <span className="text-[10px] text-emerald-600/70 ml-auto border-l border-emerald-200 pl-2">
                    {size ? `${(size / 1024).toFixed(1)} KB` : ''}
                  </span>
              </div>
              
              {content && (
                  <div className="bg-white p-0 overflow-x-auto min-h-[50px] max-h-[400px] flex justify-center">
                    {isImage && url ? (
                         <div className="p-4 w-full h-full flex items-center justify-center bg-zinc-50/30">
                            <img 
                                src={url} 
                                alt={name} 
                                className="max-w-full max-h-[300px] object-contain rounded shadow-sm border border-zinc-100" 
                            />
                         </div>
                    ) : isPdf && url ? (
                        <iframe src={url} className="w-full h-[400px] border-none" />
                    ) : (
                        <pre className="text-xs text-zinc-700 p-4 font-mono whitespace-pre leading-relaxed tab-4 w-full text-left">
                            {content}
                        </pre>
                    )}
                  </div>
              )}
          </div>
      );
  }

  return <pre className="text-xs text-zinc-500">{result}</pre>;
}
