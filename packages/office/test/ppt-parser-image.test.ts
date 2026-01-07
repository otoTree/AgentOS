import { describe, it, expect } from 'vitest';
import { PPTXParser } from '../src/ppt/parser/pptx-parser';
import JSZip from 'jszip';

describe('PPTX Parser with Images', () => {
  it('should parse images from slide relationships', async () => {
    const zip = new JSZip();
    
    // ppt/presentation.xml
    zip.file("ppt/presentation.xml", `<p:presentation></p:presentation>`);

    // ppt/slides/slide1.xml
    zip.file("ppt/slides/slide1.xml", `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:blipFill>
                <a:blip r:embed="rId1"/>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1000" cy="1000"/>
                </a:xfrm>
              </p:spPr>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    // ppt/slides/_rels/slide1.xml.rels
    zip.file("ppt/slides/_rels/slide1.xml.rels", `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
      </Relationships>
    `);

    // ppt/media/image1.png
    zip.file("ppt/media/image1.png", "fake_image_data");

    const content = await zip.generateAsync({ type: "nodebuffer" });
    
    const parser = new PPTXParser();
    const result = await parser.parse(content);
    
    expect(result.slides).toHaveLength(1);
    const elements = result.slides![0].elements;
    expect(elements).toHaveLength(1);
    expect(elements[0].type).toBe('image');
    expect(elements[0].content).toContain('base64,'); // Should contain base64 prefix
  });
});
