import React, { useSyncExternalStore } from 'react';
import { WordKernel } from '@agentos/office';
import { EditorContext } from './editor-context';
import { RenderNode } from './render-node';

type WordEditorProps = {
  kernel: WordKernel;
  readOnly?: boolean;
}

export const WordEditor: React.FC<WordEditorProps> = ({ kernel, readOnly = false }) => {
  // Subscribe to kernel changes
  const state = useSyncExternalStore(
    (callback) => kernel.subscribe(callback),
    () => kernel.getState()
  );

  return (
    <EditorContext.Provider value={{ kernel }}>
      <div className="flex justify-center bg-white min-h-screen">
        <div 
          className={`w-full max-w-[800px] px-12 py-16 ${readOnly ? 'pointer-events-none' : ''}`}
        >
          {state.content.length === 0 && (
            <div className="text-gray-300 italic">输入 "/" 插入内容...</div>
          )}
          {state.content.map((node, index) => (
            <RenderNode key={node.id} node={node} path={[index]} />
          ))}
        </div>
      </div>
    </EditorContext.Provider>
  );
};
