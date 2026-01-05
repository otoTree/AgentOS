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
                    if (node.marks?.includes('strike')) style.textDecoration = (style.textDecoration ? style.textDecoration + ' ' : '') + 'line-through';
                    
                    if (node.props?.href) {
                        return (
                            <a key={index} href={node.props.href} style={style} className="text-blue-600 hover:underline">
                                {node.text}
                            </a>
                        );
                    }
                    return <span key={index} style={style}>{node.text}</span>;
                }
                // Handle nested blocks if any? Usually Paragraph contains inlines.
                return null;
            })}
        </>
    );
};

export const ParagraphBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  const { kernel } = useEditor();
  // Simplified text extraction for editing check, but we render children properly
  const text = node.children.map((c: any) => c.text || '').join('');

  const handleBlur = (e: React.FocusEvent<HTMLParagraphElement>) => {
      const newText = e.currentTarget.textContent || '';
      // This simple comparison is flawed if we have complex structure.
      // But for now let's keep it.
      if (newText !== text) {
          kernel.exec({
              type: 'agent:replaceContent',
              payload: { path, text: newText }
          });
      }
  };

  return (
    <div className="group relative">
      {/* Handle Placeholder - visible on hover */}
      <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-30 hover:!opacity-100 cursor-grab transition-opacity select-none" contentEditable={false}>
        <div className="p-1 hover:bg-gray-100 rounded">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="9" r="1" />
                <circle cx="15" cy="9" r="1" />
                <circle cx="9" cy="15" r="1" />
                <circle cx="15" cy="15" r="1" />
            </svg>
        </div>
      </div>
      <p 
        className="mb-1 min-h-[1.5em] outline-none px-1 rounded transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
        style={{ ...node.style, lineHeight: '1.6' }}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        data-placeholder={text === '' ? "输入 '/' 插入命令" : undefined}
      >
        <RenderInline nodes={node.children} />
      </p>
    </div>
  );
};
