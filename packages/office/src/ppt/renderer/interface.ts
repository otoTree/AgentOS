import { SlideData } from '../model/schema';

export type Renderer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(slide: SlideData): any;
}
