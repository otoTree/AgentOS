import Konva from 'konva';
import { IRenderer } from './interface';
import { SheetData, Range, CellValue, Style } from '../../model/schema';
import { indexToColumn } from '../../../shared/utils';
import { ScrollManager } from './scroll-manager';
import { InteractionManager } from './interaction-manager';
import { SheetController } from '../../core/sheet-controller';
import { SizeManager } from '../../core/size-manager';

export class KonvaRenderer implements IRenderer {
  private stage: Konva.Stage | null = null;
  private gridLayer: Konva.Layer | null = null;
  private contentLayer: Konva.Layer | null = null;
  private headerLayer: Konva.Layer | null = null;
  private selectionLayer: Konva.Layer | null = null;
  private container: HTMLElement | null = null;
  private editorElement: HTMLTextAreaElement | null = null;
  private scrollManager: ScrollManager | null = null;
  private interactionManager: InteractionManager | null = null;
  private currentSheet: SheetData | null = null;
  private editingCell: { row: number; col: number } | null = null;
  private sizeManager: SizeManager | null = null;
  public onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>, hitRegion: any) => void;
  public onCellEdit?: (row: number, col: number, value: string) => void;

  // Configuration
  private cellWidth = 100;
  private cellHeight = 25;
  private headerWidth = 50;
  private headerHeight = 25;
  private headerColor = '#f4f5f7';
  private gridColor = '#e0e0e0';

  constructor() {
    // Initialize
  }

  mount(container: HTMLElement): void {
    this.container = container;
    
    // Create a wrapper for the stage that will stay fixed while container scrolls
    const stageContainer = document.createElement('div');
    stageContainer.style.position = 'sticky';
    stageContainer.style.top = '0';
    stageContainer.style.left = '0';
    container.appendChild(stageContainer);

    // Initialize Editor Element
    this.editorElement = document.createElement('textarea');
    this.editorElement.style.position = 'absolute';
    this.editorElement.style.display = 'none';
    this.editorElement.style.zIndex = '100';
    this.editorElement.style.resize = 'none';
    this.editorElement.style.border = '2px solid #1890ff';
    this.editorElement.style.padding = '2px 4px';
    this.editorElement.style.fontSize = '12px';
    this.editorElement.style.fontFamily = 'Arial';
    this.editorElement.style.outline = 'none';
    this.editorElement.style.boxSizing = 'border-box';
    this.editorElement.style.overflow = 'hidden';
    this.editorElement.style.whiteSpace = 'pre-wrap';
    
    // Attach events to editor
    this.editorElement.addEventListener('blur', this.finishEditing.bind(this));
    this.editorElement.addEventListener('keydown', this.handleEditorKeyDown.bind(this));
    
    // Append editor to container (not stageContainer, so it scrolls with flow or we position it absolutely)
    // If we append to container (which has overflow:auto), we need to position it relative to content.
    // Since stageContainer is sticky, appending to container is safer for scrolling, 
    // BUT our container has a dummy div for scrolling.
    container.appendChild(this.editorElement);

    this.stage = new Konva.Stage({
      container: stageContainer,
      width: container.clientWidth,
      height: container.clientHeight,
    });

    this.initLayers();
  }
  
  // Correction in mount method to re-order layers properly
  private initLayers() {
      if (!this.stage) return;
      this.gridLayer = new Konva.Layer();
      this.contentLayer = new Konva.Layer();
      this.selectionLayer = new Konva.Layer();
      this.headerLayer = new Konva.Layer();

      this.stage.add(this.gridLayer);
      this.stage.add(this.contentLayer);
      this.stage.add(this.selectionLayer); // Selection above content (border covers text slightly, but fill is transparent)
      this.stage.add(this.headerLayer);    // Header always on top
  }

  public getCurrentSheet(): SheetData | null {
      return this.currentSheet;
  }

  public getScrollManager(): ScrollManager | null {
      return this.scrollManager;
  }

  public getInteractionManager(): InteractionManager | null {
      return this.interactionManager;
  }

  render(sheet: SheetData, viewport?: Range): void {
    this.currentSheet = sheet;
    if (this.sizeManager) {
        this.sizeManager.updateSheet(sheet);
    } else {
        this.sizeManager = new SizeManager(sheet, this.cellWidth, this.cellHeight);
    }

    // Initialize ScrollManager if not exists
    if (!this.scrollManager && this.container) {
      this.scrollManager = new ScrollManager(
        this.container,
        this.sizeManager,
        this.headerWidth,
        this.headerHeight
      );

      this.scrollManager.onScroll((newViewport) => {
        this.draw(sheet, newViewport);
        // Also update selection rendering when scrolling
        if (this.interactionManager) {
             this.interactionManager.renderSelection();
        }
      });
    }

    // Initialize InteractionManager if not exists
    if (!this.interactionManager && this.stage && this.selectionLayer && this.scrollManager) {
      this.interactionManager = new InteractionManager(
        this.stage,
        this.selectionLayer,
        {
          sizeManager: this.sizeManager,
          headerWidth: this.headerWidth,
          headerHeight: this.headerHeight,
          rowCount: sheet.rowCount,
          colCount: sheet.colCount,
          getMergedCells: () => this.currentSheet?.mergedCells || [],
          getScroll: () => this.scrollManager?.getScrollPosition() || { scrollTop: 0, scrollLeft: 0 },
          onSelectionChange: (range) => {
            console.log('Selection changed:', range);
          },
          onCellDoubleClicked: (row, col) => {
            this.showEditor(row, col);
          },
          onResize: (type, index, newSize) => {
              if (!this.currentSheet) return;
              
              if (type === 'col') {
                  if (!this.currentSheet.colWidths) this.currentSheet.colWidths = {};
                  this.currentSheet.colWidths[index] = newSize;
              } else {
                  if (!this.currentSheet.rowHeights) this.currentSheet.rowHeights = {};
                  this.currentSheet.rowHeights[index] = newSize;
              }

              // Update ScrollManager content size (it might have changed)
              if (this.scrollManager) {
                  this.scrollManager.updateContentSize();
              }
          },
          onContextMenu: (e, hitRegion) => {
              if (this.onContextMenu) {
                  this.onContextMenu(e, hitRegion);
              }
          }
        }
      );
    }
    
    // Force initial draw
    if (this.scrollManager) {
        this.scrollManager.updateViewport();
    }
  }

  private draw(sheet: SheetData, viewport: Range): void {
    if (!this.stage || !this.gridLayer || !this.contentLayer || !this.headerLayer || !this.sizeManager) return;
    const sizeManager = this.sizeManager;
    const gridLayer = this.gridLayer;
    const contentLayer = this.contentLayer;

        this.gridLayer.destroyChildren();
        this.contentLayer.destroyChildren();
        this.headerLayer.destroyChildren();

    const { startRow, startCol, endRow, endCol } = viewport;
    const { scrollTop, scrollLeft } = this.scrollManager?.getScrollPosition() || { scrollTop: 0, scrollLeft: 0 };
    
    // 1. Draw Column Headers (Fixed Y, scrolls X)
    for (let c = startCol; c <= endCol; c++) {
      const colWidth = this.sizeManager.getColWidth(c);
      const colOffset = this.sizeManager.getColOffset(c);
      const x = colOffset - scrollLeft + this.headerWidth;
      
      // Header Background
      const rect = new Konva.Rect({
        x,
        y: 0,
        width: colWidth,
        height: this.headerHeight,
        fill: this.headerColor,
        stroke: this.gridColor,
        strokeWidth: 1,
      });
      this.headerLayer.add(rect);

      // Header Text
      const text = new Konva.Text({
        x,
        y: 0,
        width: colWidth,
        height: this.headerHeight,
        text: indexToColumn(c),
        fontSize: 12,
        fontFamily: 'Arial',
        fill: '#333',
        align: 'center',
        verticalAlign: 'middle',
      });
      this.headerLayer.add(text);
    }

    // 2. Draw Row Headers (Fixed X, scrolls Y)
    for (let r = startRow; r <= endRow; r++) {
      const rowHeight = this.sizeManager.getRowHeight(r);
      const rowOffset = this.sizeManager.getRowOffset(r);
      const y = rowOffset - scrollTop + this.headerHeight;

      // Header Background
      const rect = new Konva.Rect({
        x: 0,
        y,
        width: this.headerWidth,
        height: rowHeight,
        fill: this.headerColor,
        stroke: this.gridColor,
        strokeWidth: 1,
      });
      this.headerLayer.add(rect);

      // Header Text
      const text = new Konva.Text({
        x: 0,
        y,
        width: this.headerWidth,
        height: rowHeight,
        text: String(r + 1),
        fontSize: 12,
        fontFamily: 'Arial',
        fill: '#333',
        align: 'center',
        verticalAlign: 'middle',
      });
      this.headerLayer.add(text);
    }

    // 3. Draw Corner Header (Fixed X and Y)
    const cornerRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.headerWidth,
      height: this.headerHeight,
      fill: this.headerColor,
      stroke: this.gridColor,
      strokeWidth: 1,
    });
    this.headerLayer.add(cornerRect);


    // 4. Prepare Merged Cells
    const visibleMerges = sheet.mergedCells.filter(range => 
        range.endRow >= viewport.startRow && range.startRow <= viewport.endRow &&
        range.endCol >= viewport.startCol && range.startCol <= viewport.endCol
    );

    const maskedCells = new Set<string>();
    visibleMerges.forEach(range => {
        for(let r = range.startRow; r <= range.endRow; r++) {
            for(let c = range.startCol; c <= range.endCol; c++) {
                maskedCells.add(`${r},${c}`);
            }
        }
    });

    // 5. Draw Normal Cells
    for (let r = startRow; r <= endRow; r++) {
      const rowHeight = this.sizeManager.getRowHeight(r);
      const rowOffset = this.sizeManager.getRowOffset(r);
      const y = rowOffset - scrollTop + this.headerHeight;

      for (let c = startCol; c <= endCol; c++) {
        // Skip if covered by merge
        if (maskedCells.has(`${r},${c}`)) continue;

        const colWidth = sizeManager.getColWidth(c);
        const colOffset = sizeManager.getColOffset(c);
        const x = colOffset - scrollLeft + this.headerWidth;

        // Resolve Cell & Style
        const cellKey = `${r},${c}`;
        const cell = sheet.cells.get(cellKey);
        
        let style: any = {};
        if (cell && cell.s && sheet.styles && sheet.styles[cell.s]) {
            style = sheet.styles[cell.s];
        }

        // Draw Cell Background & Border
        const rect = new Konva.Rect({
          x,
          y,
          width: colWidth,
          height: rowHeight,
          stroke: this.gridColor,
          strokeWidth: 1,
          fill: style.backgroundColor || undefined
        });
        gridLayer.add(rect);

        // Draw Content
        if (cell && cell.v !== null && cell.v !== undefined) {
          // Font Style (Bold / Italic)
          let fontStyle = 'normal';
          if (style.bold && style.italic) {
              fontStyle = 'italic bold';
          } else if (style.bold) {
              fontStyle = 'bold';
          } else if (style.italic) {
              fontStyle = 'italic';
          }

          const text = new Konva.Text({
            x: x + 5,
            y: y + 5,
            text: String(cell.v),
            fontSize: style.fontSize || 12,
            fontFamily: style.fontFamily || 'Arial',
            fontStyle: fontStyle,
            fill: style.color || '#000',
            width: colWidth - 10,
            height: rowHeight - 10,
            align: style.align || 'left',
            verticalAlign: style.valign || 'middle',
          });
          contentLayer.add(text);
        }
      }
    }

    // 6. Draw Merged Cells
    visibleMerges.forEach(range => {
        const { startRow: r, startCol: c } = range;
        
        // Calculate dimensions
        let width = 0;
        for (let mc = range.startCol; mc <= range.endCol; mc++) {
            width += sizeManager.getColWidth(mc);
        }
        let height = 0;
        for (let mr = range.startRow; mr <= range.endRow; mr++) {
            height += sizeManager.getRowHeight(mr);
        }

        const x = sizeManager.getColOffset(c) - scrollLeft + this.headerWidth;
        const y = sizeManager.getRowOffset(r) - scrollTop + this.headerHeight;

        // Resolve Cell & Style (from top-left)
        const cellKey = `${r},${c}`;
        const cell = sheet.cells.get(cellKey);
        
        let style: any = {};
        if (cell && cell.s && sheet.styles && sheet.styles[cell.s]) {
            style = sheet.styles[cell.s];
        }

        // Draw Rect
        const rect = new Konva.Rect({
            x, y, width, height,
            stroke: this.gridColor,
            strokeWidth: 1,
            fill: style.backgroundColor || '#fff' // White background to cover underlying grid lines
        });
        gridLayer.add(rect);

        // Draw Content
        if (cell && cell.v !== null && cell.v !== undefined) {
             let fontStyle = 'normal';
             if (style.bold && style.italic) {
                 fontStyle = 'italic bold';
             } else if (style.bold) {
                 fontStyle = 'bold';
             } else if (style.italic) {
                 fontStyle = 'italic';
             }

             const text = new Konva.Text({
                 x: x + 5,
                 y: y + 5,
                 text: String(cell.v),
                 fontSize: style.fontSize || 12,
                 fontFamily: style.fontFamily || 'Arial',
                 fontStyle: fontStyle,
                 fill: style.color || '#000',
                 width: width - 10,
                 height: height - 10,
                 align: style.align || 'left',
                 verticalAlign: style.valign || 'middle',
             });
             contentLayer.add(text);
        }
    });
    
    this.headerLayer.batchDraw();
    this.gridLayer.batchDraw();
    this.contentLayer.batchDraw();
  }

  private showEditor(row: number, col: number) {
    if (!this.editorElement || !this.currentSheet || !this.sizeManager) return;

    this.editingCell = { row, col };
    const cellKey = `${row},${col}`;
    const cell = this.currentSheet.cells.get(cellKey);
    const value = cell ? String(cell.v || '') : '';

    // Calculate position
    const { scrollTop, scrollLeft } = this.scrollManager?.getScrollPosition() || { scrollTop: 0, scrollLeft: 0 };
    
    const colWidth = this.sizeManager.getColWidth(col);
    const colOffset = this.sizeManager.getColOffset(col);
    const rowHeight = this.sizeManager.getRowHeight(row);
    const rowOffset = this.sizeManager.getRowOffset(row);

    const x = colOffset - scrollLeft + this.headerWidth;
    const y = rowOffset - scrollTop + this.headerHeight;

    this.editorElement.style.display = 'block';
    this.editorElement.style.left = `${x}px`;
    this.editorElement.style.top = `${y}px`;
    this.editorElement.style.width = `${colWidth}px`;
    this.editorElement.style.height = `${rowHeight}px`;
    this.editorElement.value = value;
    
    // Focus and select all
    this.editorElement.focus();
    // setTimeout to ensure focus works and select all text
    setTimeout(() => {
        if(this.editorElement) this.editorElement.select();
    }, 0);
  }

  private finishEditing() {
    if (!this.editorElement || !this.editingCell || !this.currentSheet) {
        this.hideEditor();
        return;
    }

    const newValue = this.editorElement.value;
    const { row, col } = this.editingCell;
    const cellKey = `${row},${col}`;
    
    if (this.onCellEdit) {
        this.onCellEdit(row, col, newValue);
        this.hideEditor();
        return;
    }
    
    // Update Data Model (Directly for now, normally should go through a command/controller)
    let cell = this.currentSheet.cells.get(cellKey);
    if (!cell) {
        cell = { v: newValue };
        this.currentSheet.cells.set(cellKey, cell);
    } else {
        cell.v = newValue;
    }

    // Hide editor
    this.hideEditor();

    // Trigger Re-render
    // We need to re-draw. Since we don't have a full event loop yet, we call draw directly if viewport exists
    // But render() requires viewport. Let's use scrollManager to get current viewport and force update
    if (this.scrollManager) {
        this.scrollManager.updateViewport(); // This will trigger draw(sheet, viewport) via callback
    }
  }

  private hideEditor() {
    if (this.editorElement) {
        this.editorElement.style.display = 'none';
        this.editorElement.value = '';
    }
    this.editingCell = null;
  }

  private handleEditorKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Prevent newline
        this.finishEditing();
    } else if (e.key === 'Escape') {
        this.hideEditor();
        // Restore focus to container?
    }
  }

  destroy(): void {
    if (this.interactionManager) {
      this.interactionManager.destroy();
      this.interactionManager = null;
    }
    if (this.scrollManager) {
      this.scrollManager.destroy();
      this.scrollManager = null;
    }
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
  }

  on(event: string, handler: (data: any) => void): void {
    // Implement event handling
  }
  
  resize(width: number, height: number): void {
      if (this.stage) {
          this.stage.width(width);
          this.stage.height(height);
      }
  }

  public updateSelectionStyle(styleUpdate: Partial<Style>) {
      if (!this.interactionManager || !this.currentSheet) return;
      
      const selection = this.interactionManager.getSelection();
      if (!selection) return;

      const { startRow, startCol, endRow, endCol } = selection;

      // Ensure styles object exists
      if (!this.currentSheet.styles) {
          this.currentSheet.styles = {};
      }

      for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
              const cellKey = `${r},${c}`;
              let cell = this.currentSheet.cells.get(cellKey);
              
              if (!cell) {
                  cell = { v: null };
                  this.currentSheet.cells.set(cellKey, cell);
              }
              
              let currentStyle: Style = {};
              if (cell.s && this.currentSheet.styles[cell.s]) {
                  currentStyle = { ...this.currentSheet.styles[cell.s] };
              }

              const newStyle = { ...currentStyle, ...styleUpdate };
              
              // Generate simple Style ID based on content to reuse styles
              const styleId = JSON.stringify(newStyle);
              this.currentSheet.styles[styleId] = newStyle;
              cell.s = styleId;
          }
      }

      // Re-render
      if (this.scrollManager) {
          this.scrollManager.updateViewport();
      }
  }
}
