import { describe, it, expect } from 'vitest';
import { PPTKernel } from '../src/ppt';

describe('PPT Agent API', () => {
  it('should generate outline from presentation', () => {
    const kernel = new PPTKernel({ title: 'Agent Presentation' });
    kernel.agent.addSlideWithLayout('Slide 1 Concept');
    
    const outline = kernel.agent.getPresentationOutline();
    
    expect(outline).toContain('# Agent Presentation');
    expect(outline).toContain('## Slide 1');
    expect(outline).toContain('Slide 1 Concept');
  });

  it('should add slide with concept', () => {
    const kernel = new PPTKernel();
    const slideId = kernel.agent.addSlideWithLayout('New Idea');
    
    const state = kernel.getState();
    const slide = state.slides.find(s => s.id === slideId);
    
    expect(slide).toBeDefined();
    expect(slide?.elements[0].content).toBe('New Idea');
  });
});
