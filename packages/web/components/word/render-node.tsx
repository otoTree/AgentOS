import React from 'react';
import { BlockNode } from '@agentos/office';
import { ParagraphBlock } from './blocks/paragraph';
import { HeadingBlock } from './blocks/heading';
import { TableBlock, TableRowBlock, TableCellBlock } from './blocks/table';
import { ImageBlock } from './blocks/image';

export const RenderNode: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  switch (node.type) {
    case 'paragraph':
      return <ParagraphBlock node={node} path={path} />;
    case 'heading':
      return <HeadingBlock node={node} path={path} />;
    case 'table':
      return <TableBlock node={node} path={path} />;
    case 'table-row':
      return <TableRowBlock node={node} path={path} />;
    case 'table-cell':
      return <TableCellBlock node={node} path={path} />;
    case 'image':
      return <ImageBlock node={node} path={path} />;
    case 'list':
        // Simplified list rendering for now
        return (
            <ul className="list-disc pl-5">
                {node.children.map((child: any, index) => (
                    <li key={child.id || index}>
                         <RenderNode node={child} path={[...path, index]} />
                    </li>
                ))}
            </ul>
        );
    case 'list-item':
        // Should handle children
        // But list-item usually contains paragraphs or text? 
        // In our schema, list-item is a BlockNode, children are (Inline | Block)
        // Let's just render its content inline-ish
        return (
            <span>
                {node.children.map((child: any, index) => {
                     if (child.type === 'text') return <span key={index}>{child.text}</span>;
                     // If it has block children, render them?
                     return <RenderNode key={child.id || index} node={child} path={[...path, index]} />;
                })}
            </span>
        );
    default:
      return <div className="text-red-500">Unknown block type: {node.type}</div>;
  }
};
