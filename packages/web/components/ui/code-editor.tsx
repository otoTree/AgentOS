import React, { useEffect, useState } from 'react';
import { Editor, EditorProps, loader } from '@monaco-editor/react';

export const CodeEditor: React.FC<EditorProps> = (props) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Dynamically import monaco-editor to avoid SSR issues
    import('monaco-editor').then((monaco) => {
      loader.config({ monaco });
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return <div className="h-full w-full bg-muted/20 animate-pulse" />;
  }

  return <Editor {...props} />;
};
