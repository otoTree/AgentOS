import React from 'react';
import { CodeEditor } from '../ui/code-editor';
import { cn } from '../../lib/utils';

interface FileEditorProps {
  content: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  className?: string;
  fileName?: string;
}

export const FileEditor: React.FC<FileEditorProps> = ({
  content,
  language,
  onChange,
  readOnly = false,
  className,
  fileName
}) => {
  // Try to detect language from filename if not provided
  const detectLanguage = (name?: string) => {
    if (!name) return 'plaintext';
    const ext = name.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'json': 'json',
        'css': 'css',
        'html': 'html',
        'yaml': 'yaml',
        'yml': 'yaml',
        'txt': 'plaintext',
        'py': 'python',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'go': 'go',
        'rs': 'rust',
        'md': 'markdown'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const finalLanguage = language || detectLanguage(fileName);

  return (
    <div className={cn("h-full w-full", className)}>
      <CodeEditor
        value={content}
        language={finalLanguage}
        theme="vs-dark"
        onChange={onChange}
        options={{
          readOnly,
          minimap: { enabled: true },
          automaticLayout: true,
          fontSize: 14,
        }}
      />
    </div>
  );
};
