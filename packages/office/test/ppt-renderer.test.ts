import { describe, it, expect } from 'vitest';
import { SVGRenderer } from '../src/ppt/renderer/svg-renderer';
import { SlideData } from '../src/ppt/model/schema';

describe('SVG Renderer', () => {
  it('should render a slide to SVG', () => {
    const slide: SlideData = {
      id: 'slide1',
      layoutId: 'layout1',
      elements: [
        {
          id: 'el1',
          type: 'text',
          x: 952500, // 100px
          y: 952500, // 100px
          w: 1905000, // 200px
          h: 952500, // 100px
          style: {},
          content: 'Hello Renderer'
        }
      ]
    };

    const renderer = new SVGRenderer();
    const svg = renderer.render(slide);
    
    expect(svg).toContain('<svg');
    expect(svg).toContain('Hello Renderer');
    expect(svg).toContain('x="100"'); // 952500 / 9525 = 100
  });
});
