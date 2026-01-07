import { describe, it, expect } from 'vitest';
import { PPTKernel } from '../src/ppt';
import JSZip from 'jszip';

describe('PPT Integration', () => {
  it('should support the full cycle: Parse -> Modify -> Export', async () => {
    // 1. Create a mock PPTX
    const zip = new JSZip();
    zip.file("ppt/presentation.xml", `<p:presentation></p:presentation>`);
    zip.file("ppt/slides/slide1.xml", `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="100" cy="100"/></a:xfrm></p:spPr>
              <p:txBody><a:p><a:r><a:t>{{PLACEHOLDER}}</a:t></a:r></a:p></p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);
    const originalBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // 2. Initialize Kernel and Parse
    const kernel = new PPTKernel();
    // We need to expose parser in kernel or use it manually. 
    // Currently Kernel constructor takes state.
    // Let's manually parse and set state for this test, or add a load method to kernel.
    // Ideally Kernel should have a load() method.
    
    // For now, use the parser directly and inject state
    const { PPTXParser } = await import('../src/ppt/parser/pptx-parser');
    const parser = new PPTXParser();
    const parsedState = await parser.parse(originalBuffer);
    
    // Update Kernel State
    kernel.store.setState(s => ({
        ...s,
        slides: parsedState.slides || []
    }));

    // 3. Modify using Agent API
    const slideId = kernel.getState().slides[0].id;
    const success = kernel.agent.updateTextByPlaceholder(slideId, '{{PLACEHOLDER}}', 'Real Content');
    expect(success).toBe(true);

    // 4. Add a new Slide
    kernel.agent.addSlideWithLayout('New Slide Content');

    // 5. Export
    const exportedBuffer = await kernel.export();
    expect(exportedBuffer.length).toBeGreaterThan(originalBuffer.length); // Should be larger due to new content/library overhead
    
    // 6. Verify Export (Optional: Parse again to check content)
    const parser2 = new PPTXParser();
    const result2 = await parser2.parse(exportedBuffer);
    expect(result2.slides).toHaveLength(2);
    // Note: Exported XML structure might be different from simple mock, so deep check is complex.
    // But we check slide count at least.
  });
});
