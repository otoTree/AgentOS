export type WorkbookState = {
  id: string;
  sheets: SheetData[];
  activeSheetId: string;
};

export type SheetData = {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  cells: Map<string, CellValue>; // Key is "r,c" coordinate string
  mergedCells: Range[];
  styles: Record<string, Style>;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
};

export type CellValue = {
  v: string | number | boolean | null; // Raw value
  f?: string;                          // Formula
  t?: 's' | 'n' | 'b' | 'e' | 'd';     // Type (String, Number, Boolean, Error, Date)
  s?: string;                          // Style ID
};

export type Range = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  sheetId?: string;
};

export type Style = {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
};
