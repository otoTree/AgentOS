import { useState, useCallback, useEffect, useRef } from 'react';
import { GridData, TableState, TableConfig, CellValue } from './types';

export const useTable = (
  initialData: GridData, 
  initialConfig: TableConfig, 
  onDataChange?: (data: GridData) => void
) => {
  const [data, setData] = useState<GridData>(initialData);
  const [config, setConfig] = useState<TableConfig>(initialConfig);
  const [state, setState] = useState<TableState>({
    scrollX: 0,
    scrollY: 0,
    selection: { row: -1, col: -1 },
    editing: null,
  });

  const isFirstRender = useRef(true);

  // Notify parent of data changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onDataChange) {
      onDataChange(data);
    }
  }, [data, onDataChange]);

  const updateState = useCallback((newState: Partial<TableState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  }, []);

  const updateData = useCallback((newData: GridData) => {
    setData(newData);
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: CellValue) => {
    setData((prev) => {
      // Ensure row exists
      const newData = [...prev];
      if (!newData[row]) {
          // Fill gaps if necessary, or just assign
          newData[row] = [];
      }
      // Copy row
      newData[row] = [...(newData[row] || [])];
      newData[row][col] = value;
      return newData;
    });
  }, []);

  // Helper to get column width (default or overridden)
  const getColWidth = useCallback((colIndex: number) => {
    return config.colWidths?.[colIndex] ?? config.colWidth;
  }, [config]);

  // Helper to get row height
  const getRowHeight = useCallback((rowIndex: number) => {
    return config.rowHeights?.[rowIndex] ?? config.rowHeight;
  }, [config]);

  return {
    data,
    config,
    state,
    updateState,
    updateData,
    setCellValue,
    setConfig,
    getColWidth,
    getRowHeight
  };
};
