import PptxGenJS from 'pptxgenjs';
import { PresentationState, SlideData, Element } from '../model/schema';

export class PPTXExporter {
  async export(state: PresentationState): Promise<ArrayBuffer> {
    const pres = new PptxGenJS();
    
    // Set Metadata
    pres.title = state.title;
    
    // Process Slides
    state.slides.forEach(slideData => {
      this.processSlide(pres, slideData);
    });

    // Generate Buffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await pres.write({ outputType: 'arraybuffer' }) as any as ArrayBuffer;
  }

  private processSlide(pres: PptxGenJS, slideData: SlideData) {
    const slide = pres.addSlide();
    
    // Handle Background
    if (slideData.background) {
      if (slideData.background.type === 'solid') {
        slide.background = { color: slideData.background.value };
      }
    }

    // Handle Elements
    slideData.elements.forEach(element => {
      this.processElement(slide, element);
    });

    // Handle Notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  private processElement(slide: PptxGenJS.Slide, element: Element) {
    // Convert EMU/Pixels to Percentage or Inches for pptxgenjs
    // pptxgenjs supports percentage string '50%' or number (inches)
    
    // Assuming our schema uses EMUs (from parser) or Pixels (from renderer assumptions)
    // We need a standard. Let's assume the schema is normalized to Pixels (96 DPI) for now 
    // or we handle the conversion here.
    
    // If values are large (> 5000), assume EMU. 1 inch = 914400 EMUs.
    // pptxgenjs uses inches by default for numbers.
    
    const EMU_PER_INCH = 914400;
    const PIXELS_PER_INCH = 96;
    
    const toInches = (val: number) => {
      if (val > 5000) {
        return val / EMU_PER_INCH;
      }
      return val / PIXELS_PER_INCH;
    };

    const x = toInches(element.x);
    const y = toInches(element.y);
    const w = toInches(element.w);
    const h = toInches(element.h);

    if (element.type === 'text') {
      slide.addText(String(element.content), {
        x, y, w, h,
        fontSize: element.style.fontSize,
        bold: element.style.bold,
        color: element.style.color ? element.style.color.replace('#', '') : undefined,
        // TODO: Map other styles
      });
    } else if (element.type === 'image') {
      // content should be base64 or path
      slide.addImage({
        data: element.content,
        x, y, w, h
      });
    }
    // TODO: Handle shapes, charts
  }
}
