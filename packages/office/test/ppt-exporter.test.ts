import { describe, it, expect } from 'vitest';
import { PPTKernel } from '../src/ppt';

describe('PPT Exporter', () => {
  it('should export presentation to buffer', async () => {
    const kernel = new PPTKernel({ title: 'Export Test' });
    kernel.agent.addSlideWithLayout('Export Content');
    
    const buffer = await kernel.export();
    
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
