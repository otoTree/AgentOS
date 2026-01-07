import Konva from 'konva';
import { Range } from '../../model/schema';

import { SizeManager } from '../../core/size-manager';

type HitRegion = 
  | { type: 'cell', row: number, col: number }
  | { type: 'col-header', col: number }
  | { type: 'row-header', row: number }
  | { type: 'corner' }
  | { type: 'col-resize', col: number }
  | { type: 'row-resize', row: number }
  | null;

export type InteractionOptions = {
  sizeManager: SizeManager;
  headerWidth: number;
  headerHeight: number;
  rowCount: number;
  colCount: number;
  getScroll: () => { scrollTop: number; scrollLeft: number };
  getMergedCells: () => Range[];
  onSelectionChange: (range: Range) => void;
  onCellDoubleClicked: (row: number, col: number) => void;
  onResize?: (type: 'col' | 'row', index: number, newSize: number) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, hitRegion: HitRegion) => void;
}

export class InteractionManager {
  private stage: Konva.Stage;
  private selectionLayer: Konva.Layer;
  private options: InteractionOptions;

  private isDragging = false;
  private isResizing = false;
  private resizeType: 'col' | 'row' | null = null;
  private resizeIndex: number = -1;
  private resizeStartPos: number = 0;
  private resizeStartSize: number = 0;

  private startCell: { row: number; col: number } | null = null;
  private currentSelection: Range | null = null;

  constructor(stage: Konva.Stage, selectionLayer: Konva.Layer, options: InteractionOptions) {
    this.stage = stage;
    this.selectionLayer = selectionLayer;
    this.options = options;
    this.initListeners();
  }

  private initListeners() {
    this.stage.on('mousedown', this.handleMouseDown.bind(this));
    this.stage.on('mousemove', this.handleMouseMove.bind(this));
    this.stage.on('mouseup', this.handleMouseUp.bind(this));
    this.stage.on('dblclick', this.handleDoubleClick.bind(this));
    
    // Also listen for mouseleave to stop dragging if user leaves the canvas
    this.stage.on('mouseleave', this.handleMouseUp.bind(this));
  }

  private getHitRegion(x: number, y: number): HitRegion {
    const { sizeManager, headerWidth, headerHeight, getScroll } = this.options;
    const { scrollTop, scrollLeft } = getScroll();
    const RESIZE_ZONE = 5;

    const inHeaderX = x < headerWidth;
    const inHeaderY = y < headerHeight;

    if (inHeaderX && inHeaderY) return { type: 'corner' };

    if (inHeaderY) {
        // Check for Column Resize
        const virtualX = x - headerWidth + scrollLeft;
        // Check if we are near a column boundary
        const colIndex = sizeManager.getColIndexAtOffset(virtualX);
        const colOffset = sizeManager.getColOffset(colIndex);
        const colWidth = sizeManager.getColWidth(colIndex);
        
        // If near right edge of column
        if (Math.abs(virtualX - (colOffset + colWidth)) <= RESIZE_ZONE) {
             return { type: 'col-resize', col: colIndex };
        }
        // If near left edge (and not first col), it's resizing previous col
        if (Math.abs(virtualX - colOffset) <= RESIZE_ZONE && colIndex > 0) {
             return { type: 'col-resize', col: colIndex - 1 };
        }

        // Column Header Click
        return { type: 'col-header', col: colIndex };
    }

    if (inHeaderX) {
        // Check for Row Resize
        const virtualY = y - headerHeight + scrollTop;
        
        const rowIndex = sizeManager.getRowIndexAtOffset(virtualY);
        const rowOffset = sizeManager.getRowOffset(rowIndex);
        const rowHeight = sizeManager.getRowHeight(rowIndex);

        // If near bottom edge
        if (Math.abs(virtualY - (rowOffset + rowHeight)) <= RESIZE_ZONE) {
            return { type: 'row-resize', row: rowIndex };
        }
        // If near top edge
        if (Math.abs(virtualY - rowOffset) <= RESIZE_ZONE && rowIndex > 0) {
            return { type: 'row-resize', row: rowIndex - 1 };
        }

        // Row Header Click
        return { type: 'row-header', row: rowIndex };
    }

    // Cell
    const virtualX = x - headerWidth + scrollLeft;
    const virtualY = y - headerHeight + scrollTop;
    const col = sizeManager.getColIndexAtOffset(virtualX);
    const row = sizeManager.getRowIndexAtOffset(virtualY);
    
    if (col < 0 || row < 0) return null;

    return { type: 'cell', row, col };
  }

  private getCellAtPosition(x: number, y: number): { row: number; col: number } | null {
    const region = this.getHitRegion(x, y);
    if (region && region.type === 'cell') {
        return { row: region.row, col: region.col };
    }
    return null;
  }

  private handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    // Only handle left click
    if (e.evt.button !== 0) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const region = this.getHitRegion(pos.x, pos.y);
    if (!region) return;

    if (region.type === 'col-resize') {
        this.isResizing = true;
        this.resizeType = 'col';
        this.resizeIndex = region.col;
        this.resizeStartPos = pos.x;
        this.resizeStartSize = this.options.sizeManager.getColWidth(region.col);
        document.body.style.cursor = 'col-resize';
    } else if (region.type === 'row-resize') {
        this.isResizing = true;
        this.resizeType = 'row';
        this.resizeIndex = region.row;
        this.resizeStartPos = pos.y;
        this.resizeStartSize = this.options.sizeManager.getRowHeight(region.row);
        document.body.style.cursor = 'row-resize';
    } else if (region.type === 'cell') {
        this.isDragging = true;
        this.startCell = { row: region.row, col: region.col };
        this.updateSelection(this.startCell, this.startCell);
    } else if (region.type === 'col-header') {
        if (region.col >= 0 && region.col < this.options.colCount) {
             const start = { row: 0, col: region.col };
             const end = { row: this.options.rowCount - 1, col: region.col };
             this.updateSelection(start, end);
        }
    } else if (region.type === 'row-header') {
        if (region.row >= 0 && region.row < this.options.rowCount) {
             const start = { row: region.row, col: 0 };
             const end = { row: region.row, col: this.options.colCount - 1 };
             this.updateSelection(start, end);
        }
    } else if (region.type === 'corner') {
        const start = { row: 0, col: 0 };
        const end = { row: this.options.rowCount - 1, col: this.options.colCount - 1 };
        this.updateSelection(start, end);
    }
  }

  private handleDoubleClick(e: Konva.KonvaEventObject<MouseEvent>) {
    // Only handle left click
    if (e.evt.button !== 0) return;

    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    const cell = this.getCellAtPosition(pos.x, pos.y);
    if (!cell) return;

    this.options.onCellDoubleClicked(cell.row, cell.col);
  }

  private handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const pos = this.stage.getPointerPosition();
    if (!pos) return;

    // Handle Resizing
    if (this.isResizing && this.resizeType && this.resizeIndex !== -1) {
        let delta = 0;
        let newSize = 0;

        if (this.resizeType === 'col') {
            delta = pos.x - this.resizeStartPos;
            newSize = Math.max(5, this.resizeStartSize + delta); // Min width 5px
            if (this.options.onResize) {
                this.options.onResize('col', this.resizeIndex, newSize);
            }
        } else {
            delta = pos.y - this.resizeStartPos;
            newSize = Math.max(5, this.resizeStartSize + delta); // Min height 5px
            if (this.options.onResize) {
                this.options.onResize('row', this.resizeIndex, newSize);
            }
        }
        return;
    }

    // Handle Cursor Style (when not dragging/resizing)
    if (!this.isDragging && !this.isResizing) {
        const region = this.getHitRegion(pos.x, pos.y);
        if (region?.type === 'col-resize') {
            document.body.style.cursor = 'col-resize';
        } else if (region?.type === 'row-resize') {
            document.body.style.cursor = 'row-resize';
        } else if (region?.type === 'col-header' || region?.type === 'row-header') {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    }

    if (!this.isDragging || !this.startCell) return;

    const cell = this.getCellAtPosition(pos.x, pos.y);
    if (!cell) return;

    this.updateSelection(this.startCell, cell);
  }

  private handleMouseUp() {
    this.isDragging = false;
    this.startCell = null;

    if (this.isResizing) {
        this.isResizing = false;
        this.resizeType = null;
        this.resizeIndex = -1;
        document.body.style.cursor = 'default';
    }
  }

  private updateSelection(start: { row: number; col: number }, end: { row: number; col: number }) {
    let newSelection: Range = {
      startRow: Math.min(start.row, end.row),
      endRow: Math.max(start.row, end.row),
      startCol: Math.min(start.col, end.col),
      endCol: Math.max(start.col, end.col),
    };

    // Expand selection to include merged cells
    if (this.options.getMergedCells) {
        const mergedCells = this.options.getMergedCells();
        let changed = true;
        while (changed) {
            changed = false;
            for (const merge of mergedCells) {
                // Check if merge overlaps with current selection
                const overlaps = !(
                    merge.endRow < newSelection.startRow ||
                    merge.startRow > newSelection.endRow ||
                    merge.endCol < newSelection.startCol ||
                    merge.startCol > newSelection.endCol
                );

                if (overlaps) {
                    // Union
                    const newStartRow = Math.min(newSelection.startRow, merge.startRow);
                    const newEndRow = Math.max(newSelection.endRow, merge.endRow);
                    const newStartCol = Math.min(newSelection.startCol, merge.startCol);
                    const newEndCol = Math.max(newSelection.endCol, merge.endCol);

                    if (
                        newStartRow !== newSelection.startRow ||
                        newEndRow !== newSelection.endRow ||
                        newStartCol !== newSelection.startCol ||
                        newEndCol !== newSelection.endCol
                    ) {
                        newSelection = {
                            startRow: newStartRow,
                            endRow: newEndRow,
                            startCol: newStartCol,
                            endCol: newEndCol
                        };
                        changed = true;
                    }
                }
            }
        }
    }

    // Optimization: Don't redraw if selection hasn't changed
    if (
      this.currentSelection &&
      this.currentSelection.startRow === newSelection.startRow &&
      this.currentSelection.endRow === newSelection.endRow &&
      this.currentSelection.startCol === newSelection.startCol &&
      this.currentSelection.endCol === newSelection.endCol
    ) {
      return;
    }

    this.currentSelection = newSelection;
    this.options.onSelectionChange(newSelection);
    this.renderSelection();
  }

  public getSelection(): Range | null {
    return this.currentSelection;
  }

  public renderSelection() {
    if (!this.currentSelection) return;

    const { sizeManager, headerWidth, headerHeight, getScroll } = this.options;
    const { scrollTop, scrollLeft } = getScroll();
    const { startRow, endRow, startCol, endCol } = this.currentSelection;

    // Calculate position relative to stage (viewport)
    const startX = sizeManager.getColOffset(startCol);
    const endX = sizeManager.getColOffset(endCol) + sizeManager.getColWidth(endCol);
    const startY = sizeManager.getRowOffset(startRow);
    const endY = sizeManager.getRowOffset(endRow) + sizeManager.getRowHeight(endRow);

    const x = startX - scrollLeft + headerWidth;
    const y = startY - scrollTop + headerHeight;
    const width = endX - startX;
    const height = endY - startY;

    this.selectionLayer.destroyChildren();

    // Selection Fill (Transparent Blue)
    const fillRect = new Konva.Rect({
      x,
      y,
      width,
      height,
      fill: 'rgba(24, 144, 255, 0.1)',
      listening: false, // Pass events through to cells below
    });
    this.selectionLayer.add(fillRect);

    // Selection Border (Solid Blue)
    const borderRect = new Konva.Rect({
      x,
      y,
      width,
      height,
      stroke: '#1890ff',
      strokeWidth: 2,
      listening: false,
    });
    this.selectionLayer.add(borderRect);

    this.selectionLayer.batchDraw();
  }

  public destroy() {
    this.stage.off('mousedown', this.handleMouseDown);
    this.stage.off('mousemove', this.handleMouseMove);
    this.stage.off('mouseup', this.handleMouseUp);
    this.stage.off('mouseleave', this.handleMouseUp);
  }
}
