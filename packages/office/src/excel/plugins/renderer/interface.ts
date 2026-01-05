import { SheetData, Range } from '../../model/schema';

export type IRenderer = {
  mount(container: HTMLElement): void;
  render(sheet: SheetData, viewport: Range): void;
  destroy(): void;
  on(event: string, handler: (data: any) => void): void;
}
