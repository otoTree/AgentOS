import { describe, it, expect } from 'vitest';
import { PPTKernel } from '../src/ppt';

describe('PPT Kernel', () => {
  it('should initialize with default state', () => {
    const kernel = new PPTKernel();
    const state = kernel.getState();
    
    expect(state.title).toBe('New Presentation');
    expect(state.slides).toHaveLength(0);
    expect(state.theme.fonts.heading).toBe('Calibri Light');
  });

  it('should initialize with custom state', () => {
    const kernel = new PPTKernel({ title: 'My Presentation' });
    const state = kernel.getState();
    
    expect(state.title).toBe('My Presentation');
  });
});
