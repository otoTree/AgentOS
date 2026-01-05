import React, { useEffect, useRef } from 'react';
import { KonvaRenderer } from '@agentos/office/src/excel/plugins/renderer/konva-renderer';
import { SheetData } from '@agentos/office/src/excel/model/schema';
import { SheetController } from '@agentos/office/src/excel/core/sheet-controller';
import { HistoryManager } from '@agentos/office/src/excel/command/history-manager';
import { MergeCellsCommand, UnmergeCellsCommand, SetCellCommand } from '@agentos/office/src/excel/command/commands';
import { Command } from '@agentos/office/src/excel/command/interface';
import { Toolbar } from './toolbar';
import { ContextMenu, ContextMenuAction } from './context-menu';

interface ExcelEditorProps {
  initialData?: SheetData;
}

export const ExcelEditor: React.FC<ExcelEditorProps> = ({ initialData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<KonvaRenderer | null>(null);
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, visible: boolean, region: any }>({ 
      x: 0, 
      y: 0, 
      visible: false,
      region: null
  });

  const executeCommand = (command: Command) => {
      if (!rendererRef.current) return;
      const sheet = rendererRef.current.getCurrentSheet();
      if (!sheet) return;
      
      const newSheet = historyManagerRef.current.execute(sheet, command);
      rendererRef.current.render(newSheet, { 
          startRow: 0, startCol: 0, endRow: 20, endCol: 10
      });
      rendererRef.current.getScrollManager()?.updateContentSize();
      rendererRef.current.getScrollManager()?.updateViewport();
  };

  const handleStyleChange = (style: any) => {
      if (rendererRef.current) {
          rendererRef.current.updateSelectionStyle(style);
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo
                if (!rendererRef.current) return;
                const sheet = rendererRef.current.getCurrentSheet();
                if (!sheet) return;
                const newSheet = historyManagerRef.current.redo(sheet);
                if (newSheet) {
                    rendererRef.current.render(newSheet, { 
                        startRow: 0, startCol: 0, endRow: 20, endCol: 10
                    });
                    rendererRef.current.getScrollManager()?.updateContentSize();
                    rendererRef.current.getScrollManager()?.updateViewport();
                }
            } else {
                // Undo
                if (!rendererRef.current) return;
                const sheet = rendererRef.current.getCurrentSheet();
                if (!sheet) return;
                const newSheet = historyManagerRef.current.undo(sheet);
                if (newSheet) {
                    rendererRef.current.render(newSheet, { 
                        startRow: 0, startCol: 0, endRow: 20, endCol: 10
                    });
                    rendererRef.current.getScrollManager()?.updateContentSize();
                    rendererRef.current.getScrollManager()?.updateViewport();
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Renderer
    const renderer = new KonvaRenderer();
    renderer.mount(containerRef.current);
    rendererRef.current = renderer;

    renderer.onContextMenu = (e, region) => {
        const stageBox = containerRef.current?.getBoundingClientRect();
        if (stageBox) {
             setContextMenu({
                 x: e.evt.clientX - stageBox.left,
                 y: e.evt.clientY - stageBox.top,
                 visible: true,
                 region
             });
        }
    };

    renderer.onCellEdit = (row, col, value) => {
         const sheet = renderer.getCurrentSheet();
         if (!sheet) return;
         const cell = sheet.cells.get(`${row},${col}`);
         const oldValue = cell ? (cell.v === null || cell.v === undefined ? null : String(cell.v)) : null;
         
         const command = new SetCellCommand(row, col, value, oldValue);
         executeCommand(command);
    };

    // Create default empty sheet if no data provided
    const sheet: SheetData = initialData || {
      id: 'sheet1',
      name: 'Sheet1',
      rowCount: 1000,
      colCount: 100,
      cells: new Map(),
      mergedCells: [],
      styles: {}
    };

    // Initial Render
    renderer.render(sheet, {
        startRow: 0,
        startCol: 0,
        endRow: 20,
        endCol: 10
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
        // Trigger re-render or resize logic if needed
        // Currently renderer handles layout on mount, but dynamic resize might need update
        if (rendererRef.current) {
            // Re-mount or update size logic would go here
            // For MVP, we just rely on initial size or reload
             rendererRef.current.render(sheet, {
                startRow: 0,
                startCol: 0,
                endRow: 20,
                endCol: 10
            });
        }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      renderer.destroy();
      resizeObserver.disconnect();
    };
  }, [initialData]);

  const handleContextMenuAction = (action: ContextMenuAction) => {
      const region = contextMenu.region;
      if (!rendererRef.current || !region) {
          setContextMenu(prev => ({ ...prev, visible: false }));
          return;
      }
      
      const sheet = rendererRef.current.getCurrentSheet();
      if (!sheet) return;

      let newSheet: SheetData = sheet;
      let targetRow = -1;
      let targetCol = -1;

      if (region.type === 'cell') {
          targetRow = region.row;
          targetCol = region.col;
      } else if (region.type === 'row-header') {
          targetRow = region.row;
          targetCol = 0; // Default
      } else if (region.type === 'col-header') {
          targetRow = 0; // Default
          targetCol = region.col;
      }

      switch (action) {
          case 'insert-row-above':
              if (targetRow >= 0) newSheet = SheetController.insertRow(sheet, targetRow);
              break;
          case 'insert-row-below':
              if (targetRow >= 0) newSheet = SheetController.insertRow(sheet, targetRow + 1);
              break;
          case 'delete-row':
              if (targetRow >= 0) newSheet = SheetController.deleteRow(sheet, targetRow);
              break;
          case 'insert-col-left':
              if (targetCol >= 0) newSheet = SheetController.insertCol(sheet, targetCol);
              break;
          case 'insert-col-right':
              if (targetCol >= 0) newSheet = SheetController.insertCol(sheet, targetCol + 1);
              break;
          case 'delete-col':
              if (targetCol >= 0) newSheet = SheetController.deleteCol(sheet, targetCol);
              break;
          case 'clear-content':
             // Should use current selection for clear content
             const selection = rendererRef.current.getInteractionManager()?.getSelection();
             if (selection) {
                 newSheet = SheetController.clearContent(sheet, selection);
             } else if (targetRow >= 0 && targetCol >= 0) {
                 // Fallback to single cell
                 newSheet = SheetController.clearContent(sheet, { 
                     startRow: targetRow, endRow: targetRow, 
                     startCol: targetCol, endCol: targetCol 
                 });
             }
             break;
          case 'merge-cells':
              {
                  const selection = rendererRef.current.getInteractionManager()?.getSelection();
                  if (selection) {
                      const command = new MergeCellsCommand(selection);
                      executeCommand(command);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      return; 
                  }
              }
              break;
          case 'unmerge-cells':
              {
                  const selection = rendererRef.current.getInteractionManager()?.getSelection();
                  if (selection) {
                      const command = new UnmergeCellsCommand(selection);
                      executeCommand(command);
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      return;
                  }
              }
              break;
      }

      // Render new sheet
      // Note: In a real app we would set state via onDataChange prop, 
      // but for now we just re-render.
      // However, we need to update the sizeManager too in the renderer.
      rendererRef.current.render(newSheet, { 
          startRow: 0, startCol: 0, endRow: 20, endCol: 10 // Viewport will be auto-calculated by scroll manager
      });
      // Force update scroll manager size
      rendererRef.current.getScrollManager()?.updateContentSize();
      rendererRef.current.getScrollManager()?.updateViewport();

      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="flex flex-col w-full h-full border border-gray-200 rounded-md overflow-hidden relative">
        <Toolbar onStyleChange={handleStyleChange} />
        <div 
            ref={containerRef} 
            className="flex-1 relative overflow-hidden"
            style={{ minHeight: '600px' }}
        />
        <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            visible={contextMenu.visible} 
            onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
            onAction={handleContextMenuAction}
        />
    </div>
  );
};
