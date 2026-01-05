export type Path = number[];

export type DocumentState = {
  uid: string;
  metadata: Record<string, any>;
  content: BlockNode[];
};

export type BlockNodeType = 'paragraph' | 'heading' | 'table' | 'table-row' | 'table-cell' | 'image' | 'list' | 'list-item';

export type BlockNode = {
  type: BlockNodeType;
  id: string;
  props: Record<string, any>; // For image: src, width, height. For table: borders.
  style?: Record<string, any>; // CSS-like styles: color, fontSize, etc.
  children: (InlineNode | BlockNode)[];
};

export type InlineNode = {
  type: 'text';
  text: string;
  marks: ('bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link')[];
  props?: Record<string, any>; // For links: href
  style?: Record<string, any>; // CSS-like styles: color, fontSize, etc.
};

export type Selection = {
  anchor: { path: number[]; offset: number };
  focus: { path: number[]; offset: number };
};
