'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { GridData, TableConfig, TableState, CellValue } from './types';
import Konva from 'konva';
import { useThemeColors } from './useThemeColors';
import { cn } from '@/lib/infra/utils';

interface TableCanvasProps {
  data: GridData;
  config: TableConfig;
  state: TableState;
  onStateChange: (newState: Partial<TableState>) => void;
  onSelectionChange?: (row: number, col: number) => void;
  onCellClick: (row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onEditComplete: (row: number, col: number, value: CellValue) => void;
}

interface CellEditorProps {
    row: number;
    col: number;
    initialValue: string;
    width: number;
    height: number;
    top: number;
    left: number;
    onComplete: (value: string, moveSelection?: { dRow: number; dCol: number }) => void;
    onCancel: () => void;
}

const CellEditor: React.FC<CellEditorProps> = ({
    row, col, initialValue, width, height, top, left, onComplete, onCancel
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onComplete(value, { dRow: 1, dCol: 0 }); // Move down
        } else if (e.key === 'Tab') {
            e.preventDefault();
            onComplete(value, { dRow: 0, dCol: e.shiftKey ? -1 : 1 }); // Move right (or left)
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleBlur = () => {
        onComplete(value);
    };

    return (
        <input
            ref={inputRef}
            className={cn(
                "absolute border-2 border-primary outline-none px-1 text-sm z-10 shadow-sm bg-background text-foreground"
            )}
            style={{
                top,
                left,
                width,
                height,
            }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};

// Convert number to A, B, C, AA, AB...
const getColumnLabel = (index: number): string => {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};

const TableCanvas: React.FC<TableCanvasProps> = ({
  data,
  config,
  state,
  onStateChange,
  onSelectionChange,
  onCellClick,
  onCellDoubleClick,
  onEditComplete,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colors = useThemeColors();
  
  // Determine max rows/cols to render
  // We want to render at least enough to fill the screen, or the data size, whichever is larger
  // But infinite scroll feel means we might render a bit more
  const rowCount = Math.max(data.length + 5, Math.ceil(config.height / config.rowHeight) + 1);
  // Estimate col count based on width
  const colCount = Math.max(
    (data[0]?.length || 0) + 5, 
    Math.ceil(config.width / config.colWidth) + 1
  );

  // Calculate total width/height for scroll container
  // This is tricky with variable widths. For now assuming fixed defaults for "infinite" area
  // We sum up known widths/heights and add defaults for the rest
  const totalWidth = useMemo(() => {
     let w = config.rowHeaderWidth;
     // Sum known columns
     // Actually for now let's just use a large number if we want "infinite" or strict bounds if not
     // Let's stick to "data bounds + buffer" for scroll size
     const maxDataCol = data.reduce((max, row) => Math.max(max, row?.length || 0), 0);
     const renderCols = Math.max(maxDataCol + 10, 26); // At least A-Z
     
     for(let i=0; i<renderCols; i++) {
         w += config.colWidths?.[i] ?? config.colWidth;
     }
     return w;
  }, [data, config]);

  const totalHeight = useMemo(() => {
      const renderRows = Math.max(data.length + 20, 100);
      let h = config.headerHeight;
      for(let i=0; i<renderRows; i++) {
          h += config.rowHeights?.[i] ?? config.rowHeight;
      }
      return h;
  }, [data, config]);

  // Virtualization State
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    setScrollPos({ x: scrollLeft, y: scrollTop });
    onStateChange({ scrollX: scrollLeft, scrollY: scrollTop });
  };

  const handleCellClickInternal = (row: number, col: number) => {
    onCellClick(row, col);
    containerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (state.editing) return; // Let input handle it

    const { row, col } = state.selection;
    if (row === -1 || col === -1) return;

    let nextRow = row;
    let nextCol = col;
    let handled = true;

    switch (e.key) {
        case 'ArrowUp':
            nextRow = Math.max(0, row - 1);
            break;
        case 'ArrowDown':
            // Allow going past data end to add new rows virtually
            nextRow = row + 1;
            break;
        case 'ArrowLeft':
            nextCol = Math.max(0, col - 1);
            break;
        case 'ArrowRight':
            nextCol = col + 1;
            break;
        case 'Tab':
            e.preventDefault();
            if (e.shiftKey) nextCol = Math.max(0, col - 1);
            else nextCol = col + 1;
            break;
        case 'Enter':
            e.preventDefault();
            nextRow = row + 1;
            break;
        case 'F2':
            onCellDoubleClick(row, col);
            return;
        case 'Backspace':
        case 'Delete':
            onEditComplete(row, col, '');
            return;
        default:
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Type to edit
                e.preventDefault(); // Prevent duplicate input in the newly focused editor
                onStateChange({ editing: { row, col, initialValue: e.key } });
                return;
            }
            handled = false;
    }

    if (handled) {
        e.preventDefault();
        onStateChange({ selection: { row: nextRow, col: nextCol } });
        onSelectionChange?.(nextRow, nextCol);
        scrollToCell(nextRow, nextCol);
    }
  };

  const scrollToCell = (row: number, col: number) => {
      // Simplified scroll into view
      // We need to know the x/y of the cell
      // This is expensive with variable widths, but let's approximate or calc
      // For now, assuming default sizes for simplicity in this function
      // A proper implementation would cache cumulative offsets
      
      const rowTop = config.headerHeight + row * config.rowHeight; // Approximation if no variable heights
      const rowBottom = rowTop + config.rowHeight;
      const colLeft = config.rowHeaderWidth + col * config.colWidth;
      const colRight = colLeft + config.colWidth;

      const container = containerRef.current;
      if (container) {
          if (rowTop < container.scrollTop + config.headerHeight) {
              container.scrollTop = rowTop - config.headerHeight;
          } else if (rowBottom > container.scrollTop + container.clientHeight) {
              container.scrollTop = rowBottom - container.clientHeight;
          }
          
          if (colLeft < container.scrollLeft + config.rowHeaderWidth) {
              container.scrollLeft = colLeft - config.rowHeaderWidth;
          } else if (colRight > container.scrollLeft + container.clientWidth) {
              container.scrollLeft = colRight - container.clientWidth;
          }
      }
  };

  // Calculate visible range
  // Simplified for fixed sizes, logic needs expansion for variable sizes
  const startRow = Math.floor(scrollPos.y / config.rowHeight);
  const visibleRows = Math.ceil(config.height / config.rowHeight) + 1;
  const endRow = startRow + visibleRows;
  
  const startCol = Math.floor(scrollPos.x / config.colWidth);
  const visibleCols = Math.ceil(config.width / config.colWidth) + 1;
  const endCol = startCol + visibleCols;

  // Render Grid
  const renderGrid = () => {
    const elements = [];
    
    // We render a bit more than visible to be safe
    const rStart = Math.max(0, startRow - 2);
    const rEnd = endRow + 2;
    const cStart = Math.max(0, startCol - 2);
    const cEnd = endCol + 2;

    for (let r = rStart; r < rEnd; r++) {
        const y = config.headerHeight + r * config.rowHeight;
        
        for (let c = cStart; c < cEnd; c++) {
            const x = config.rowHeaderWidth + c * config.colWidth;
            const isSelected = state.selection.row === r && state.selection.col === c;
            
            // Get value safely
            const val = data[r]?.[c];

            elements.push(
                <Group 
                    key={`${r}-${c}`} 
                    x={x} 
                    y={y}
                    onClick={() => handleCellClickInternal(r, c)}
                    onDblClick={() => onCellDoubleClick(r, c)}
                >
                    <Rect
                        width={config.colWidth}
                        height={config.rowHeight}
                        fill={colors.background}
                        stroke={colors.border}
                        strokeWidth={1}
                    />
                    <Text
                        x={4}
                        y={config.rowHeight / 2 - 7}
                        text={val !== undefined && val !== null ? String(val) : ''}
                        width={config.colWidth - 8}
                        fontSize={14}
                        fill={colors.foreground}
                        ellipsis={true}
                        listening={false}
                    />
                </Group>
            );
        }
    }
    return <Group x={-scrollPos.x} y={-scrollPos.y}>{elements}</Group>;
  };

  // Render Headers
  const renderHeaders = () => {
      const colHeaders = [];
      const rowHeaders = [];
      
      const rStart = Math.max(0, startRow - 2);
      const rEnd = endRow + 2;
      const cStart = Math.max(0, startCol - 2);
      const cEnd = endCol + 2;

      // Column Headers (A, B, C...)
      for (let c = cStart; c < cEnd; c++) {
          const x = config.rowHeaderWidth + c * config.colWidth;
          const isSelected = state.selection.col === c; // Highlight if column selected?
          
          colHeaders.push(
              <Group key={`col-${c}`} x={x} y={0}>
                  <Rect
                      width={config.colWidth}
                      height={config.headerHeight}
                      fill={colors.muted}
                      stroke={colors.border}
                      strokeWidth={1}
                  />
                  <Text
                      x={0}
                      y={config.headerHeight / 2 - 7}
                      width={config.colWidth}
                      text={getColumnLabel(c)}
                      align="center"
                      fontSize={14}
                      fill={colors.mutedForeground}
                  />
              </Group>
          );
      }

      // Row Headers (1, 2, 3...)
      for (let r = rStart; r < rEnd; r++) {
          const y = config.headerHeight + r * config.rowHeight;
          
          rowHeaders.push(
              <Group key={`row-${r}`} x={0} y={y}>
                  <Rect
                      width={config.rowHeaderWidth}
                      height={config.rowHeight}
                      fill={colors.muted}
                      stroke={colors.border}
                      strokeWidth={1}
                  />
                  <Text
                      x={0}
                      y={config.rowHeight / 2 - 7}
                      width={config.rowHeaderWidth - 4}
                      text={String(r + 1)}
                      align="right"
                      fontSize={12}
                      fill={colors.mutedForeground}
                  />
              </Group>
          );
      }
      
      return (
          <>
            <Group x={-scrollPos.x} y={0}>{colHeaders}</Group>
            <Group x={0} y={-scrollPos.y}>{rowHeaders}</Group>
            {/* Corner Cell */}
            <Rect 
                width={config.rowHeaderWidth} 
                height={config.headerHeight} 
                fill={colors.muted}
                stroke={colors.border}
                strokeWidth={1}
            />
          </>
      );
  };

  const renderSelection = () => {
      const { row, col } = state.selection;
      if (row === -1 || col === -1) return null;
      
      const x = config.rowHeaderWidth + col * config.colWidth;
      const y = config.headerHeight + row * config.rowHeight;

      return (
          <Group x={-scrollPos.x} y={-scrollPos.y}>
              <Rect
                  x={x}
                  y={y}
                  width={config.colWidth}
                  height={config.rowHeight}
                  stroke={colors.selection}
                  strokeWidth={2}
                  listening={false}
              />
          </Group>
      );
  };

  const renderEditor = () => {
    if (!state.editing) return null;
    const { row, col, initialValue } = state.editing;
    
    // Calculate position
    const top = config.headerHeight + row * config.rowHeight;
    const left = config.rowHeaderWidth + col * config.colWidth;
    
    // Adjust for scroll
    const renderTop = top - scrollPos.y;
    const renderLeft = left - scrollPos.x;
    
    // Visibility check simplified
    if (renderTop < config.headerHeight - config.rowHeight || renderLeft < config.rowHeaderWidth - config.colWidth) return null;

    // Determine initial value: props > data > empty
    let startValue = '';
    if (initialValue !== undefined) {
        startValue = initialValue;
    } else {
        const val = data[row]?.[col];
        startValue = val === undefined || val === null ? '' : String(val);
    }

    return (
        <CellEditor
            key={`${row}-${col}`} // Force remount on cell change
            row={row}
            col={col}
            initialValue={startValue}
            width={config.colWidth}
            height={config.rowHeight}
            top={renderTop}
            left={renderLeft}
            onComplete={(value, move) => {
                onEditComplete(row, col, value);
                onStateChange({ editing: null });
                if (move) {
                    onStateChange({ selection: { row: row + move.dRow, col: col + move.dCol } });
                    // Optionally scroll into view
                }
                containerRef.current?.focus();
            }}
            onCancel={() => {
                onStateChange({ editing: null });
                containerRef.current?.focus();
            }}
        />
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      className="overflow-auto border border-border relative bg-background outline-none"
      style={{
        width: config.width,
        height: config.height,
      }}
    >
      <div style={{ width: totalWidth, height: totalHeight, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'sticky', top: 0, left: 0 }}>
        <Stage
          width={config.width}
          height={config.height}
          ref={stageRef}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Layer>
            {renderGrid()}
            {renderSelection()}
            {renderHeaders()}
          </Layer>
        </Stage>
        {renderEditor()}
      </div>
    </div>
  );
};

export default TableCanvas;
