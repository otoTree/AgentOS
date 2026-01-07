import { describe, it, expect } from 'vitest';
import { PPTXParser } from '../src/ppt/parser/pptx-parser';
import JSZip from 'jszip';

describe('PPTX Parser', () => {
  it('should parse a minimal PPTX structure', async () => {
    // Create a mock PPTX using JSZip
    const zip = new JSZip();
    
    // ppt/presentation.xml
    zip.file("ppt/presentation.xml", `
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:sldIdLst>
          <p:sldId id="256" r:id="rId2"/>
        </p:sldIdLst>
      </p:presentation>
    `);

    // ppt/slides/slide1.xml
    zip.file("ppt/slides/slide1.xml", `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="100" y="200"/>
                  <a:ext cx="300" cy="400"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:t>Hello World</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const content = await zip.generateAsync({ type: "nodebuffer" });
    
    const parser = new PPTXParser();
    const result = await parser.parse(content);
    
    expect(result.slides).toHaveLength(1);
    expect(result.slides![0].elements).toHaveLength(1);
    expect(result.slides![0].elements[0].content).toBe('Hello World');
    expect(result.slides![0].elements[0].x).toBe(100);
  });
});
