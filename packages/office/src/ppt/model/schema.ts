export type ElementType = 'text' | 'image' | 'shape' | 'chart' | 'table' | 'group';

export type ElementStyle = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type Element = {
  id: string;
  type: ElementType;
  x: number; // 相对坐标 0-1000
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  style: ElementStyle;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
}

export type BackgroundConfig = {
  type: 'solid' | 'gradient' | 'image';
  value: string; // color code or image url
}

export type SlideData = {
  id: string;
  layoutId: string;
  elements: Element[];
  background?: BackgroundConfig;
  notes?: string;
}

export type MasterSlide = {
  id: string;
  name: string;
  elements: Element[];
  background?: BackgroundConfig;
}

export type LayoutData = {
  id: string;
  masterId: string;
  name: string;
  elements: Element[]; // Layout specific placeholders
}

export type ThemeConfig = {
  colors: string[];
  fonts: {
    heading: string;
    body: string;
  };
}

export type PresentationState = {
  id: string;
  title: string;
  slides: SlideData[];
  masters: MasterSlide[];
  layouts: LayoutData[];
  theme: ThemeConfig;
}
