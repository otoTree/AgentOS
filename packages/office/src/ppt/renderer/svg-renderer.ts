import { SlideData, Element } from '../model/schema';
import { Renderer } from './interface';

export class SVGRenderer implements Renderer {
  private width: number;
  private height: number;

  constructor(width: number = 960, height: number = 540) {
    this.width = width;
    this.height = height;
  }

  render(slide: SlideData): string {
    let svg = `<svg width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    if (slide.background) {
       if (slide.background.type === 'solid') {
         svg += `<rect width="100%" height="100%" fill="${slide.background.value}"/>`;
       }
       // TODO: Handle gradient/image
    } else {
       svg += `<rect width="100%" height="100%" fill="white"/>`;
    }

    slide.elements.forEach(el => {
      svg += this.renderElement(el);
    });

    svg += `</svg>`;
    return svg;
  }

  private renderElement(el: Element): string {
    // Assuming schema stores EMUs (from parser) and we want to render to pixels.
    // 1 inch = 914400 EMUs = 96 px
    // Scale factor = 96 / 914400 = 1 / 9525
    const EMU_PER_PIXEL = 9525;
    
    // Check if values are likely EMUs (large numbers) or Pixels
    // If x > 5000, likely EMU.
    const isEMU = el.x > 5000 || el.w > 5000;
    const scale = isEMU ? 1 / EMU_PER_PIXEL : 1;

    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.w * scale;
    const h = el.h * scale;

    if (el.type === 'text') {
        // Simple text rendering
        // For better text handling, foreignObject is preferred in web context
        return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 14px; color: black; word-wrap: break-word; overflow: hidden; height: 100%;">
            ${(el.content as string).replace(/\n/g, '<br/>')}
          </div>
        </foreignObject>`;
    }
    
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" stroke="gray" stroke-dasharray="4"/>`;
  }
}
