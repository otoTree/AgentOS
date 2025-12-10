import { FileEditor } from '../../components';

interface FilePreviewModalProps {
  file: any;
  onClose: () => void;
  previewUrl: string | null;
  previewContent: string | null;
  previewLoading: boolean;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  onSave: (newContent: string) => Promise<void>;
}

export function FilePreviewModal({
  file,
  onClose,
  previewUrl,
  previewContent,
  previewLoading,
  isEditing,
  setIsEditing,
  onSave
}: FilePreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-background rounded-lg shadow-lg w-[90vw] h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="flex items-center justify-between p-4 border-b">
                 <div className="flex items-center gap-4">
                     <h3 className="font-semibold truncate max-w-[400px]">{file.name}</h3>
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
                     onClick={onClose}
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
                         file={file}
                         initialContent={previewContent}
                         onSave={onSave}
                     />
                 ) : (
                     <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                         {file.mimeType.startsWith("image/") ? (
                             <img src={previewUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
                         ) : file.mimeType === "application/pdf" ? (
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
  );
}
