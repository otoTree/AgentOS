import React from 'react';
import { BlockNode } from '@agentos/office';
import { RenderNode } from '../render-node';

export const TableBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  return (
    <div className="overflow-x-auto my-4">
      <table className="border-collapse border border-gray-300 w-full text-sm">
        <tbody>
          {node.children.map((child, index) => {
            if (child.type === 'text') return null;
            return <RenderNode key={child.id || index} node={child} path={[...path, index]} />;
          })}
        </tbody>
      </table>
    </div>
  );
};

export const TableRowBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  return (
    <tr>
      {node.children.map((child, index) => {
        if (child.type === 'text') return null;
        return <RenderNode key={child.id || index} node={child} path={[...path, index]} />;
      })}
    </tr>
  );
};

export const TableCellBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  const isHeader = node.props.header;
  const Tag = isHeader ? 'th' : 'td';
  
  return (
    <Tag className={`border border-gray-300 p-2 ${isHeader ? 'bg-gray-100 font-bold' : ''}`}>
      {node.children.map((child, index) => {
         if (child.type === 'text') {
             return <span key={index}>{child.text}</span>;
         }
         return <RenderNode key={child.id || index} node={child} path={[...path, index]} />;
      })}
    </Tag>
  );
};
