import React from 'react';
import { Editor, EditorProps, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure loader to use local monaco instance instead of CDN
loader.config({ monaco });

export const CodeEditor: React.FC<EditorProps> = (props) => {
  return <Editor {...props} />;
};
