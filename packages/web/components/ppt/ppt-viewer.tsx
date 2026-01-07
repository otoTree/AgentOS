import React, { useEffect, useRef, useState } from 'react';
import { SlideData } from '@agentos/office/src/ppt/model/schema';
import { SVGRenderer } from '@agentos/office/src/ppt/renderer/svg-renderer';

interface PPTViewerProps {
  slide: SlideData | undefined;
  width?: number;
  height?: number;
}

export const PPTViewer: React.FC<PPTViewerProps> = ({ slide, width = 960, height = 540 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    if (slide) {
      const renderer = new SVGRenderer(width, height);
      const svg = renderer.render(slide);
      setSvgContent(svg);
    } else {
      setSvgContent('');
    }
  }, [slide, width, height]);

  if (!slide) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 text-gray-400"
        style={{ width, height }}
      >
        No Slide Selected
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border shadow-sm bg-white"
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};
