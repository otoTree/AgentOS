import { describe, it, expect } from 'vitest';
import { PPTKernel } from '../src/ppt';

describe('PPT Agent API Extended', () => {
  it('should update text by placeholder', () => {
    const kernel = new PPTKernel();
    const slideId = kernel.agent.addSlideWithLayout('{{TITLE_PLACEHOLDER}}');
    
    const success = kernel.agent.updateTextByPlaceholder(slideId, '{{TITLE_PLACEHOLDER}}', 'Final Title');
    
    expect(success).toBe(true);
    
    const state = kernel.getState();
    const slide = state.slides.find(s => s.id === slideId);
    expect(slide?.elements[0].content).toBe('Final Title');
  });

  it('should support undo of operations', () => {
    const kernel = new PPTKernel();
    const slideId = kernel.agent.addSlideWithLayout('Draft Title');
    
    kernel.agent.updateTextByPlaceholder(slideId, 'Draft Title', 'Final Title');
    expect(kernel.getState().slides[0].elements[0].content).toBe('Final Title');
    
    kernel.commandBus.undo();
    expect(kernel.getState().slides[0].elements[0].content).toBe('Draft Title');
  });
});
