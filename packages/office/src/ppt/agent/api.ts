import { PPTKernel } from '../index';
import { SlideData } from '../model/schema';
import { AddSlideCommand, UpdateElementContentCommand } from '../core/commands';
import { v4 as uuidv4 } from 'uuid';

export class AgentAPI {
  private kernel: PPTKernel;

  constructor(kernel: PPTKernel) {
    this.kernel = kernel;
  }

  /**
   * Returns a markdown outline of the presentation
   */
  getPresentationOutline(): string {
    const state = this.kernel.getState();
    let markdown = `# ${state.title}\n\n`;
    
    state.slides.forEach((slide, index) => {
      markdown += `## Slide ${index + 1}\n`;
      slide.elements.forEach(el => {
        if (el.type === 'text') {
           // Normalize content for display
           const content = (el.content as string).replace(/\n/g, ' ').trim();
           if (content) {
             markdown += `- ${content}\n`;
           }
        }
      });
      if (slide.notes) {
        markdown += `> Notes: ${slide.notes}\n`;
      }
      markdown += '\n';
    });
    
    return markdown;
  }

  /**
   * Adds a new slide based on a concept (simple implementation)
   */
  addSlideWithLayout(concept: string): string {
    const slideId = uuidv4();
    
    // A simplified layout strategy: Title at top
    const newSlide: SlideData = {
      id: slideId,
      layoutId: 'title-content',
      elements: [
        {
          id: uuidv4(),
          type: 'text',
          x: 457200, // ~50px
          y: 457200, // ~50px
          w: 8229600, // ~860px (Full width minus margins)
          h: 1371600, // ~150px
          style: { fontSize: 44, bold: true },
          content: concept
        }
      ]
    };

    this.kernel.commandBus.execute(new AddSlideCommand(this.kernel.store, newSlide));

    return slideId;
  }

  /**
   * Updates text content of an element by finding a placeholder string
   */
  updateTextByPlaceholder(slideId: string, placeholderName: string, text: string): boolean {
    const state = this.kernel.getState();
    const slide = state.slides.find(s => s.id === slideId);
    
    if (!slide) return false;

    // Simple placeholder matching: check if content exactly matches or contains placeholder
    // In a real system, we might use specific element IDs or metadata
    const element = slide.elements.find(el => 
      el.type === 'text' && 
      (typeof el.content === 'string' && el.content.includes(placeholderName))
    );

    if (element) {
      this.kernel.commandBus.execute(
        new UpdateElementContentCommand(this.kernel.store, slideId, element.id, text)
      );
      return true;
    }

    return false;
  }
}
