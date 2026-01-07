import { Command } from './command';
import { PPTStore } from './store';
import { SlideData, Element } from '../model/schema';

export class AddSlideCommand implements Command {
  constructor(
    private store: PPTStore,
    private slide: SlideData
  ) {}

  execute() {
    this.store.setState(state => ({
      ...state,
      slides: [...state.slides, this.slide]
    }));
  }

  undo() {
    this.store.setState(state => ({
      ...state,
      slides: state.slides.filter(s => s.id !== this.slide.id)
    }));
  }
}

export class AddElementCommand implements Command {
  constructor(
    private store: PPTStore,
    private slideId: string,
    private element: Element
  ) {}

  execute() {
    this.store.setState(state => ({
      ...state,
      slides: state.slides.map(slide => {
        if (slide.id === this.slideId) {
          return {
            ...slide,
            elements: [...slide.elements, this.element]
          };
        }
        return slide;
      })
    }));
  }

  undo() {
    this.store.setState(state => ({
      ...state,
      slides: state.slides.map(slide => {
        if (slide.id === this.slideId) {
          return {
            ...slide,
            elements: slide.elements.filter(e => e.id !== this.element.id)
          };
        }
        return slide;
      })
    }));
  }
}

export class UpdateElementContentCommand implements Command {
  private previousContent: any;

  constructor(
    private store: PPTStore,
    private slideId: string,
    private elementId: string,
    private newContent: any
  ) {}

  execute() {
    const state = this.store.getState();
    const slide = state.slides.find(s => s.id === this.slideId);
    const element = slide?.elements.find(e => e.id === this.elementId);
    
    if (element) {
      this.previousContent = element.content;
      
      this.store.setState(state => ({
        ...state,
        slides: state.slides.map(s => {
          if (s.id === this.slideId) {
            return {
              ...s,
              elements: s.elements.map(e => {
                if (e.id === this.elementId) {
                  return { ...e, content: this.newContent };
                }
                return e;
              })
            };
          }
          return s;
        })
      }));
    }
  }

  undo() {
    if (this.previousContent !== undefined) {
      this.store.setState(state => ({
        ...state,
        slides: state.slides.map(s => {
          if (s.id === this.slideId) {
            return {
              ...s,
              elements: s.elements.map(e => {
                if (e.id === this.elementId) {
                  return { ...e, content: this.previousContent };
                }
                return e;
              })
            };
          }
          return s;
        })
      }));
    }
  }
}
