export type CellValue = string | number | null | undefined;

// Using a dense array of arrays for "CSV" like structure
// data[rowIndex][colIndex]
export type GridData = CellValue[][];

export interface TableConfig {
  rowHeight: number;
  colWidth: number; // Default column width
  headerHeight: number;
  rowHeaderWidth: number; // Width of the 1, 2, 3... column
  width: number;
  height: number;
  // Overrides for specific rows/cols
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
}

export interface TableState {
  scrollX: number;
  scrollY: number;
  selection: {
    row: number; // -1 means no selection
    col: number; // -1 means no selection
  };
  editing: {
    row: number;
    col: number;
    initialValue?: string; // Value to start editing with (if typing started it)
  } | null;
}

export interface TableEvents {
  onCellChange?: (row: number, col: number, value: CellValue) => void;
  onSelectionChange?: (row: number, col: number) => void;
}

export interface Sheet {
  id: string;
  name: string;
  data: GridData;
}

export interface Workbook {
  id: string;
  name: string;
  sheets: Sheet[];
  activeSheetId: string | null;
  lastModified?: number;
  isDirty?: boolean; // Unsaved changes
}

export interface StorageConfig {
  autoSaveInterval?: number; // ms
  enableAutoSave: boolean;
}
