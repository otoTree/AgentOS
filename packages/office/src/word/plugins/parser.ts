import { WordPlugin } from '../core/plugin';
import { DocumentState, BlockNode, InlineNode } from '../model/schema';
import * as mammoth from 'mammoth';
import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    ImageRun,
    HeadingLevel,
    AlignmentType
} from 'docx';
import { v4 as uuidv4 } from 'uuid';
import * as htmlparser2 from 'htmlparser2';
import { Element, Text, AnyNode } from 'domhandler';

export class DocxParserPlugin implements WordPlugin {
  name = 'docx-parser';

  onInit(kernel: any) {
    kernel.importDocx = this.importDocx.bind(this);
    kernel.exportDocx = this.exportDocx.bind(this);
  }

  async importDocx(input: Buffer | ArrayBuffer): Promise<DocumentState> {
    // Convert Docx to HTML using Mammoth
    let options: any = {};
    if (input instanceof ArrayBuffer) {
        options = { arrayBuffer: input };
    } else {
        options = { buffer: input };
    }

    const result = await mammoth.convertToHtml(options);
    const html = result.value; // The generated HTML
    const messages = result.messages; // Any warnings

    // Parse HTML to DOM
    const dom = htmlparser2.parseDocument(html);
    
    // Convert DOM to Internal Schema
    const content = this.domToSchema(dom.children);

    return {
      uid: uuidv4(),
      metadata: { messages },
      content
    };
  }

  private domToSchema(nodes: AnyNode[]): BlockNode[] {
      const blocks: BlockNode[] = [];
      
      for (const node of nodes) {
          const block = this.parseBlock(node);
          if (block) {
              if (Array.isArray(block)) {
                  blocks.push(...block);
              } else {
                  blocks.push(block);
              }
          }
      }
      
      return blocks;
  }

  private parseStyle(styleString: string | undefined): Record<string, any> | undefined {
      if (!styleString) return undefined;
      const style: Record<string, any> = {};
      styleString.split(';').forEach(rule => {
          const [key, value] = rule.split(':').map(s => s.trim());
          if (key && value) {
              // CamelCase conversion for React style
              const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
              style[camelKey] = value;
          }
      });
      return Object.keys(style).length > 0 ? style : undefined;
  }

  private parseBlock(node: AnyNode): BlockNode | BlockNode[] | null {
      if (node.type === 'tag') {
          const element = node as Element;
          const tagName = element.name;
          const style = this.parseStyle(element.attribs.style);

          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
              return {
                  type: 'heading',
                  id: uuidv4(),
                  props: { level: parseInt(tagName.substring(1)) },
                  style,
                  children: this.parseInline(element.children)
              };
          }

          if (tagName === 'p') {
              // Check if it contains an image (Mammoth puts images inside paragraphs usually)
              // But if it's purely an image, we might want to lift it? 
              // For now, treat as paragraph.
              return {
                  type: 'paragraph',
                  id: uuidv4(),
                  props: {},
                  style,
                  children: this.parseInline(element.children)
              };
          }

          if (tagName === 'ul' || tagName === 'ol') {
              return {
                  type: 'list',
                  id: uuidv4(),
                  props: { ordered: tagName === 'ol' },
                  children: element.children.map((child: AnyNode) => {
                      if (child.type === 'tag' && (child as Element).name === 'li') {
                           return {
                               type: 'list-item',
                               id: uuidv4(),
                               props: {},
                               children: this.parseInline((child as Element).children)
                           } as BlockNode;
                      }
                      return null;
                  }).filter(Boolean) as BlockNode[]
              };
          }

          if (tagName === 'table') {
              return {
                  type: 'table',
                  id: uuidv4(),
                  props: {},
                  children: element.children.map((child: AnyNode) => {
                      if (child.type === 'tag' && ['thead', 'tbody'].includes((child as Element).name)) {
                          // Flatten thead/tbody for now or handle them. 
                          // Schema is flexible. Let's just process their children (trs)
                          return (child as Element).children.map((tr: AnyNode) => this.parseBlock(tr));
                      }
                      if (child.type === 'tag' && (child as Element).name === 'tr') {
                          return this.parseBlock(child);
                      }
                      return null;
                  }).flat().filter(Boolean) as BlockNode[]
              };
          }
          
          if (tagName === 'tr') {
              return {
                  type: 'table-row',
                  id: uuidv4(),
                  props: {},
                  children: element.children.map(child => this.parseBlock(child)).filter(Boolean) as BlockNode[]
              };
          }
          
          if (tagName === 'td' || tagName === 'th') {
               return {
                  type: 'table-cell',
                  id: uuidv4(),
                  props: { header: tagName === 'th' },
                  children: this.parseMixed(element.children)
               };
          }
          
          if (tagName === 'img') {
              return {
                  type: 'image',
                  id: uuidv4(),
                  props: {
                      src: element.attribs.src,
                      alt: element.attribs.alt
                  },
                  children: []
              };
          }
      }
      
      return null;
  }

  private parseMixed(nodes: AnyNode[]): (BlockNode | InlineNode)[] {
      const result: (BlockNode | InlineNode)[] = [];
      for (const node of nodes) {
          const block = this.parseBlock(node);
          if (block) {
              if (Array.isArray(block)) {
                  result.push(...block);
              } else {
                  result.push(block);
              }
          } else {
              // Try inline
              const inlines = this.parseInline([node]);
              result.push(...inlines);
          }
      }
      return result;
  }

  private parseInline(nodes: AnyNode[]): (InlineNode | BlockNode)[] {
      const result: (InlineNode | BlockNode)[] = [];
      
      for (const node of nodes) {
          if (node.type === 'text') {
              result.push({
                  type: 'text',
                  text: (node as Text).data,
                  marks: []
              });
          } else if (node.type === 'tag') {
              const element = node as Element;
              const tagName = element.name;
              const style = this.parseStyle(element.attribs.style);
              
              if (tagName === 'span') {
                   // Handle spans with style
                   const children = this.parseInline(element.children);
                   if (style) {
                       children.forEach(c => {
                           if (c.type === 'text') {
                               c.style = { ...c.style, ...style };
                           }
                       });
                   }
                   result.push(...children);
              } else if (tagName === 'strong' || tagName === 'b') {
                  const children = this.parseInline(element.children);
                  this.addMark(children, 'bold');
                  if (style) children.forEach(c => { if(c.type === 'text') c.style = { ...c.style, ...style }});
                  result.push(...children);
              } else if (tagName === 'em' || tagName === 'i') {
                   const children = this.parseInline(element.children);
                   this.addMark(children, 'italic');
                   if (style) children.forEach(c => { if(c.type === 'text') c.style = { ...c.style, ...style }});
                   result.push(...children);
              } else if (tagName === 'a') {
                   const children = this.parseInline(element.children);
                   this.addMark(children, 'link'); // And props? Schema needs update for link props or put in marks?
                   // Current schema: marks: string[]. InlineNode has props? Yes I added it.
                   children.forEach(c => {
                       if (c.type === 'text') {
                           c.props = { ...c.props, href: element.attribs.href };
                           if (style) c.style = { ...c.style, ...style };
                       }
                   });
                   result.push(...children);
              } else if (tagName === 'br') {
                  result.push({ type: 'text', text: '\n', marks: [] });
              } else if (tagName === 'img') {
                   // Image inline?
                   result.push({
                      type: 'image',
                      id: uuidv4(),
                      props: {
                          src: element.attribs.src,
                          alt: element.attribs.alt,
                          width: element.attribs.width ? parseInt(element.attribs.width) : undefined,
                          height: element.attribs.height ? parseInt(element.attribs.height) : undefined
                      },
                      style,
                      children: []
                   } as any); // Image is BlockNode usually but allowed in children? 
                   // Schema: children: (InlineNode | BlockNode)[] -> Yes.
              } else {
                  // Fallback for other tags, just parse children
                  const children = this.parseInline(element.children);
                  if (style) {
                      children.forEach(c => {
                          if (c.type === 'text') {
                              c.style = { ...c.style, ...style };
                          }
                      });
                  }
                  result.push(...children);
              }
          }
      }
      return result;
  }
  
  private addMark(nodes: (InlineNode | BlockNode)[], mark: any) {
      nodes.forEach(node => {
          if (node.type === 'text') {
              if (!node.marks) node.marks = [];
              if (!node.marks.includes(mark)) node.marks.push(mark);
          }
      });
  }

  async exportDocx(state: DocumentState): Promise<Buffer | Blob> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: await this.stateToDocx(state.content)
      }]
    });

    if (typeof window !== 'undefined') {
        return await Packer.toBlob(doc);
    }
    return await Packer.toBuffer(doc);
  }

  private async fetchImage(src: string): Promise<Buffer | Uint8Array | null> {
      if (!src) return null;
      if (src.startsWith('data:image')) {
          try {
              const data = src.split(',')[1];
              return Buffer.from(data, 'base64');
          } catch (e) {
              console.error("Failed to process base64 image", e);
              return null;
          }
      }
      
      try {
          const response = await fetch(src);
          if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
      } catch (e) {
          console.error("Failed to fetch image from URL", src, e);
          return null;
      }
  }

  private async stateToDocx(nodes: BlockNode[]): Promise<any[]> {
      const results = await Promise.all(nodes.map(async node => {
          switch (node.type) {
              case 'paragraph':
                  return new Paragraph({
                      children: await this.inlineToDocx(node.children),
                      ...this.mapParagraphStyle(node.style)
                  });
              case 'heading':
                  return new Paragraph({
                      heading: this.getHeadingLevel(node.props.level),
                      children: await this.inlineToDocx(node.children),
                      ...this.mapParagraphStyle(node.style)
                  });
              case 'table':
                  const rows = await Promise.all(node.children.map(async row => {
                      if (row.type !== 'table-row') return null;
                      const cells = await Promise.all(row.children.map(async cell => {
                          if (cell.type !== 'table-cell') return null;
                          return new TableCell({
                              children: [
                                  new Paragraph({
                                      children: await this.inlineToDocx(cell.children)
                                  })
                              ]
                          });
                      }));
                      return new TableRow({
                          children: cells.filter(Boolean) as TableCell[]
                      });
                  }));
                  return new Table({
                      rows: rows.filter(Boolean) as TableRow[]
                  });
              case 'list':
                   // Simplified list handling (flat list items)
                   // Docx handles lists via numbering. This is complex.
                   // Fallback: render list items as paragraphs with bullet point
                   return node.children.map(li => {
                       if (li.type !== 'list-item') return new Paragraph({ text: '' });
                       return new Paragraph({
                           text: `• ${(li as BlockNode).children.map((c:any) => c.text).join('')}`, // Very simplified
                       });
                   });
              case 'image':
                   const buffer = await this.fetchImage(node.props.src);
                   if (buffer) {
                       return new Paragraph({
                           children: [
                               new ImageRun({
                                   data: buffer,
                                   transformation: {
                                       width: node.props.width || 100,
                                       height: node.props.height || 100
                                   }
                               } as any)
                           ]
                       });
                   }
                   return new Paragraph({ text: "" }); // Silent fail
              default:
                  return new Paragraph({ text: "" });
          }
      }));
      return results.flat().filter(Boolean);
  }

  private async inlineToDocx(nodes: (InlineNode | BlockNode)[]): Promise<any[]> {
      const results = await Promise.all(nodes.map(async node => {
          if (node.type === 'text') {
              const styleOptions = this.mapStyleToOptions(node.style);
              return new TextRun({
                  text: node.text,
                  bold: node.marks?.includes('bold'),
                  italics: node.marks?.includes('italic'),
                  strike: node.marks?.includes('strike'),
                  underline: node.marks?.includes('underline') ? {} : undefined,
                  ...styleOptions
              });
          }
          if (node.type === 'image') {
              const buffer = await this.fetchImage(node.props.src);
              if (buffer) {
                  return new ImageRun({
                      data: buffer,
                      transformation: {
                          width: node.props.width || 100,
                          height: node.props.height || 100
                      }
                  } as any);
              }
              return new TextRun("");
          }
          return new TextRun("");
      }));
      return results;
  }

  private mapParagraphStyle(style: Record<string, any> | undefined): any {
      if (!style) return {};
      const options: any = {};
      
      if (style.textAlign) {
          switch (style.textAlign) {
              case 'center': options.alignment = AlignmentType.CENTER; break;
              case 'right': options.alignment = AlignmentType.RIGHT; break;
              case 'justify': options.alignment = AlignmentType.JUSTIFIED; break;
              case 'left': options.alignment = AlignmentType.LEFT; break;
          }
      }

      // Indentation
      if (style.marginLeft || style.paddingLeft) {
           const val = style.marginLeft || style.paddingLeft;
           const match = val.match(/(\d+)(px|pt)?/);
           if (match) {
               // 1px approx 15 twips. 1pt = 20 twips.
               const num = parseInt(match[1]);
               const unit = match[2] || 'px';
               let twips = 0;
               if (unit === 'px') twips = num * 15;
               else if (unit === 'pt') twips = num * 20;
               else twips = num * 15; // default px
               
               options.indent = { left: twips };
           }
      }

      // Spacing (Contextual spacing)
      const spacing: any = {};
      if (style.marginTop) {
           const match = style.marginTop.match(/(\d+)(px|pt)?/);
           if (match) {
                const num = parseInt(match[1]);
                const unit = match[2] || 'px';
                // Docx spacing uses twips usually for 'after'/'before'
                // Wait, 'before'/'after' is in Twips.
                let twips = 0;
                if (unit === 'px') twips = num * 15;
                else if (unit === 'pt') twips = num * 20;
                
                spacing.before = twips;
           }
      }
      if (style.marginBottom) {
           const match = style.marginBottom.match(/(\d+)(px|pt)?/);
           if (match) {
                const num = parseInt(match[1]);
                const unit = match[2] || 'px';
                let twips = 0;
                if (unit === 'px') twips = num * 15;
                else if (unit === 'pt') twips = num * 20;
                
                spacing.after = twips;
           }
      }
      
      // Line Height
      if (style.lineHeight) {
           // line-height: 1.5 or 20px
           if (!isNaN(Number(style.lineHeight))) {
               // Unitless multiplier
               spacing.line = Math.round(Number(style.lineHeight) * 240); // 240 = 1 line
               spacing.lineRule = "auto";
           } else {
               const match = style.lineHeight.match(/(\d+)(px|pt)?/);
               if (match) {
                    const num = parseInt(match[1]);
                    // If px/pt, it's exact
                    // docx expects twips? No, 'line' in twips if lineRule is 'exact' or 'atLeast'
                    const unit = match[2] || 'px';
                    let twips = 0;
                    if (unit === 'px') twips = num * 15;
                    else if (unit === 'pt') twips = num * 20;
                    spacing.line = twips;
                    spacing.lineRule = "exact";
               }
           }
      }

      if (Object.keys(spacing).length > 0) {
          options.spacing = spacing;
      }

      return options;
  }

  private mapStyleToOptions(style: Record<string, any> | undefined): any {
      if (!style) return {};
      
      const options: any = {};
      
      if (style.color) {
          // CSS color to hex (strip #)
          const color = style.color.replace('#', '');
          // Basic check if it's a valid hex
          if (/^[0-9A-Fa-f]{6}$/.test(color)) {
              options.color = color;
          }
      }
      
      if (style.fontSize) {
          // Parse px/pt
          // 16px = 12pt = 24 half-points
          // Factor: px * 1.5 = half-points
          const match = style.fontSize.match(/(\d+)(px|pt)?/);
          if (match) {
              const val = parseInt(match[1]);
              const unit = match[2] || 'px';
              if (unit === 'px') {
                  options.size = Math.round(val * 1.5);
              } else if (unit === 'pt') {
                  options.size = val * 2;
              } else {
                  options.size = val * 2; // Default assume pt? or px?
              }
          }
      }
      
      if (style.fontFamily) {
          // Remove quotes if present
          options.font = style.fontFamily.replace(/['"]/g, '');
      }

      if (style.backgroundColor) {
         // Shading or Highlight
         // highlight supports limited colors. Shading is more flexible.
         const color = style.backgroundColor.replace('#', '');
         if (/^[0-9A-Fa-f]{6}$/.test(color)) {
             options.shading = {
                 fill: color,
                 color: "auto", 
                 type: "clear" // confusingly, type="clear" with fill=color sets the background
             };
         }
      }

      return options;
  }


  private getHeadingLevel(level: number): any {
      switch (level) {
          case 1: return HeadingLevel.HEADING_1;
          case 2: return HeadingLevel.HEADING_2;
          case 3: return HeadingLevel.HEADING_3;
          case 4: return HeadingLevel.HEADING_4;
          case 5: return HeadingLevel.HEADING_5;
          case 6: return HeadingLevel.HEADING_6;
          default: return HeadingLevel.HEADING_1;
      }
  }
}
