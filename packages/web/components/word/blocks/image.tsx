import React from 'react';
import { BlockNode } from '@agentos/office';

export const ImageBlock: React.FC<{ node: BlockNode; path: number[] }> = ({ node, path }) => {
  const { src, alt, width, height } = node.props;

  return (
    <div className="my-4 flex justify-center">
      <img 
        src={src} 
        alt={alt || 'Image'} 
        style={{ 
            maxWidth: '100%', 
            width: width ? `${width}px` : undefined,
            height: height ? `${height}px` : undefined
        }}
        className="rounded shadow-sm"
      />
    </div>
  );
};
