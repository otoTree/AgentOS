'use client';

import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTable } from './useTable';
import { useMeasure } from './useMeasure';
import { GridData, TableConfig, CellValue, TableEvents } from './types';

// Dynamically import TableCanvas to avoid SSR issues with Konva
const TableCanvas = dynamic(() => import('./TableCanvas'), {
  ssr: false,
});

export interface KonvaTableProps {
  initialData?: GridData;
  initialConfig?: Partial<TableConfig>;
  onCellChange?: (row: number, col: number, value: CellValue) => void;
  onSelectionChange?: (row: number, col: number) => void;
  onDataChange?: (data: GridData) => void;
}

export interface KonvaTableRef {
  updateCell: (row: number, col: number, value: CellValue) => void;
  getData: () => GridData;
  setConfig: (config: Partial<TableConfig>) => void;
}

const defaultData: GridData = [];

const defaultConfig: TableConfig = {
  rowHeight: 25,
  colWidth: 100,
  headerHeight: 30,
  rowHeaderWidth: 40,
  width: 800,
  height: 600,
};

const KonvaTable = forwardRef<KonvaTableRef, KonvaTableProps>(
  ({ initialData = defaultData, initialConfig = {}, onCellChange, onSelectionChange, onDataChange }, ref) => {
    const { ref: containerRef, bounds } = useMeasure();
    const {
      data,
      config,
      state,
      updateState,
      setCellValue,
      updateData,
      setConfig,
    } = useTable(initialData, { ...defaultConfig, ...initialConfig }, onDataChange);

    // Update config when bounds change
    useEffect(() => {
      if (bounds.width > 0 && bounds.height > 0) {
        setConfig((prev) => ({ ...prev, width: bounds.width, height: bounds.height }));
      }
    }, [bounds.width, bounds.height, setConfig]);

    useImperativeHandle(ref, () => ({
      updateCell: setCellValue,
      getData: () => data,
      setConfig: (newConfig) => setConfig((prev) => ({ ...prev, ...newConfig })),
    }));

    const handleCellClick = (row: number, col: number) => {
      updateState({ selection: { row, col } });
      onSelectionChange?.(row, col);
    };

    const handleCellDoubleClick = (row: number, col: number) => {
       updateState({ editing: { row, col } });
    };

    const handleEditComplete = (row: number, col: number, value: CellValue) => {
        setCellValue(row, col, value);
        onCellChange?.(row, col, value);
    };

    return (
      <div ref={containerRef} className="w-full h-full">
        <TableCanvas
            data={data}
            config={config}
            state={state}
            onStateChange={updateState}
            onSelectionChange={onSelectionChange}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            onEditComplete={handleEditComplete}
        />
      </div>
    );
  }
);

KonvaTable.displayName = 'KonvaTable';

export default KonvaTable;
