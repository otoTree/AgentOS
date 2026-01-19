import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { PresentationState, SlideData, Element } from '../model/schema';
import { v4 as uuidv4 } from 'uuid';

export class PPTXParser {
  private zip: JSZip;
  private xmlParser: XMLParser;

  constructor() {
    this.zip = new JSZip();
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
  }

  async parse(data: ArrayBuffer | Buffer): Promise<Partial<PresentationState>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zip = await this.zip.loadAsync(data as any);
    
    // Parse presentation.xml
    const presentationXml = await zip.file("ppt/presentation.xml")?.async("string");
    if (!presentationXml) {
      throw new Error("Invalid PPTX: ppt/presentation.xml not found");
    }

    // const presentationObj = this.xmlParser.parse(presentationXml);
    // TODO: Extract slide IDs and map to slide files to preserve order
    
    // For now, let's just find slide files by pattern ppt/slides/slide*.xml
    const slides: SlideData[] = [];
    const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/));
    
    // Sort naturally to try to keep order
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)/)?.[0] || "0");
        const numB = parseInt(b.match(/(\d+)/)?.[0] || "0");
        return numA - numB;
    });

    for (const slideFile of slideFiles) {
      const slideXml = await zip.file(slideFile)?.async("string");
      // Parse relationships to find media
      const relsFile = slideFile.replace('ppt/slides/', 'ppt/slides/_rels/').replace('.xml', '.xml.rels');
      const relsXml = await zip.file(relsFile)?.async("string");
      const relationships = relsXml ? this.parseRelationships(relsXml) : new Map<string, string>();

      if (slideXml) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slideData = await this.parseSlide(slideXml, slideFile, relationships, zip);
        slides.push(slideData);
      }
    }

    return {
      slides
    };
  }

  private parseRelationships(xml: string): Map<string, string> {
    const obj = this.xmlParser.parse(xml);
    const map = new Map<string, string>();
    const rels = obj["Relationships"]?.["Relationship"];
    
    if (rels) {
      const list = Array.isArray(rels) ? rels : [rels];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list.forEach((r: any) => {
        if (r["@_Id"] && r["@_Target"]) {
          map.set(r["@_Id"], r["@_Target"]);
        }
      });
    }
    return map;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async parseSlide(xml: string, filename: string, relationships: Map<string, string>, zip: any): Promise<SlideData> {
    const obj = this.xmlParser.parse(xml);
    const elements: Element[] = [];
    
    // Basic implementation to extract text from shapes
    // Traverse spTree (Shape Tree)
    const spTree = obj["p:sld"]?.["p:cSld"]?.["p:spTree"];
    if (spTree) {
      // Handle Groups (p:grpSp), Shapes (p:sp), GraphicFrames (p:graphicFrame), Picture (p:pic)
      // This is a recursive process in a real implementation
      const shapes = Array.isArray(spTree["p:sp"]) ? spTree["p:sp"] : (spTree["p:sp"] ? [spTree["p:sp"]] : []);
      const pics = Array.isArray(spTree["p:pic"]) ? spTree["p:pic"] : (spTree["p:pic"] ? [spTree["p:pic"]] : []);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shapes.forEach((sp: any) => {
        if (!sp) return;
        
        const text = this.extractTextFromShape(sp);
        // Even if no text, it might be a shape. But for now we focus on content.
        if (text) {
          // Try to extract coordinates
          const xfrm = sp["p:spPr"]?.["a:xfrm"];
          const off = xfrm?.["a:off"];
          const ext = xfrm?.["a:ext"];
          
          const x = parseInt(off?.["@_x"] || "0");
          const y = parseInt(off?.["@_y"] || "0");
          const w = parseInt(ext?.["@_cx"] || "0");
          const h = parseInt(ext?.["@_cy"] || "0");

          elements.push({
            id: uuidv4(),
            type: 'text',
            x: x, 
            y: y,
            w: w,
            h: h,
            style: {},
            content: text
          });
        }
      });

      // Handle Pictures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const pic of pics) {
        if (!pic) continue;
        
        const blip = pic["p:blipFill"]?.["a:blip"];
        const embedId = blip?.["@_r:embed"];
        
        if (embedId && relationships.has(embedId)) {
           const target = relationships.get(embedId)!;
           // target is usually relative like "../media/image1.png"
           // We need to resolve it relative to ppt/slides/
           // Simple hack: if it starts with ../, remove it and prepend ppt/
           let imagePath = target;
           if (target.startsWith('../')) {
             imagePath = 'ppt/' + target.substring(3);
           }

           const imgData = await zip.file(imagePath)?.async("base64");
           if (imgData) {
              const xfrm = pic["p:spPr"]?.["a:xfrm"];
              const off = xfrm?.["a:off"];
              const ext = xfrm?.["a:ext"];
              
              const x = parseInt(off?.["@_x"] || "0");
              const y = parseInt(off?.["@_y"] || "0");
              const w = parseInt(ext?.["@_cx"] || "0");
              const h = parseInt(ext?.["@_cy"] || "0");

              elements.push({
                id: uuidv4(),
                type: 'image',
                x, y, w, h,
                style: {},
                content: "data:image/png;base64," + imgData // Assume png for simplicity, should detect type
              });
           }
        }
      }
    }

    return {
      id: filename, // temporary ID
      layoutId: 'default',
      elements
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTextFromShape(sp: any): string {
    // p:txBody -> a:p -> a:r -> a:t
    const txBody = sp["p:txBody"];
    if (!txBody) return "";

    const paragraphs = Array.isArray(txBody["a:p"]) ? txBody["a:p"] : [txBody["a:p"]];
    let text = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paragraphs.forEach((p: any) => {
      if (p["a:r"]) {
        const runs = Array.isArray(p["a:r"]) ? p["a:r"] : [p["a:r"]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        runs.forEach((r: any) => {
          if (r["a:t"]) {
            text += r["a:t"];
          }
        });
      }
      text += "\n";
    });

    return text.trim();
  }
}
