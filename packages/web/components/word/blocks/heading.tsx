import React from 'react';
import { BlockNode, InlineNode } from '@agentos/office';
import { useEditor } from '../editor-context';

const RenderInline: React.FC<{ nodes: (InlineNode | BlockNode)[] }> = ({ nodes }) => {
    return (
        <>
            {nodes.map((node, index) => {
                if (node.type === 'text') {
                    const style: React.CSSProperties = node.style || {};
                    if (node.marks?.includes('bold')) style.fontWeight = 'bold';
                    if (node.marks?.includes('italic')) style.fontStyle = 'italic';
                    if (node.marks?.includes('underline')) style.textDecoration = 'underline';
                    
                    return <span key={index} style={style}>{node.text}</span>;
                }
                return null;
            })}
        </>
    );
};

export const HeadingBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  const { kernel } = useEditor();
  const text = node.children.map((c: any) => c.text || '').join('');
  const level = node.props.level || 1;
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const handleBlur = (e: React.FocusEvent<any>) => {
      const newText = e.currentTarget.textContent || '';
      if (newText !== text) {
          kernel.exec({
              type: 'agent:replaceContent',
              payload: { path, text: newText }
          });
      }
  };

  return (
    <Tag 
      className="font-bold outline-none hover:bg-gray-50 px-1 rounded transition-colors mb-2 mt-4"
      style={node.style}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
    >
      <RenderInline nodes={node.children} />
    </Tag>
  );
};
