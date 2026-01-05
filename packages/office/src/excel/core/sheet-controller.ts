import { SheetData, CellValue, Range } from '../model/schema';

export class SheetController {
    static insertRow(sheet: SheetData, rowIndex: number): SheetData {
        const newSheet = { ...sheet };
        newSheet.rowCount++;
        
        // 1. Shift Row Heights
        if (newSheet.rowHeights) {
            const newRowHeights: Record<number, number> = {};
            Object.entries(newSheet.rowHeights).forEach(([key, height]) => {
                const r = parseInt(key);
                if (r >= rowIndex) {
                    newRowHeights[r + 1] = height;
                } else {
                    newRowHeights[r] = height;
                }
            });
            newSheet.rowHeights = newRowHeights;
        }

        // 2. Shift Cells
        // We need to collect updates first to avoid conflicts
        const moves: { oldKey: string, newKey: string, cell: CellValue }[] = [];
        const toDelete: string[] = [];

        newSheet.cells.forEach((cell, key) => {
            const [r, c] = key.split(',').map(Number);
            if (r >= rowIndex) {
                moves.push({
                    oldKey: key,
                    newKey: `${r + 1},${c}`,
                    cell
                });
                toDelete.push(key);
            }
        });

        // Apply deletions
        toDelete.forEach(key => newSheet.cells.delete(key));
        // Apply moves
        moves.forEach(({ newKey, cell }) => newSheet.cells.set(newKey, cell));

        // 3. Update Merged Cells
        newSheet.mergedCells = newSheet.mergedCells.map(range => {
            if (range.startRow >= rowIndex) {
                return { ...range, startRow: range.startRow + 1, endRow: range.endRow + 1 };
            } else if (range.endRow >= rowIndex) {
                // Range spans across the insertion point -> expand it
                return { ...range, endRow: range.endRow + 1 };
            }
            return range;
        });

        return newSheet;
    }

    static deleteRow(sheet: SheetData, rowIndex: number): SheetData {
        const newSheet = { ...sheet };
        newSheet.rowCount = Math.max(0, newSheet.rowCount - 1);

        // 1. Shift Row Heights
        if (newSheet.rowHeights) {
            const newRowHeights: Record<number, number> = {};
            Object.entries(newSheet.rowHeights).forEach(([key, height]) => {
                const r = parseInt(key);
                if (r === rowIndex) return; // Delete
                if (r > rowIndex) {
                    newRowHeights[r - 1] = height;
                } else {
                    newRowHeights[r] = height;
                }
            });
            newSheet.rowHeights = newRowHeights;
        }

        // 2. Shift Cells
        const moves: { oldKey: string, newKey: string, cell: CellValue }[] = [];
        const toDelete: string[] = [];

        newSheet.cells.forEach((cell, key) => {
            const [r, c] = key.split(',').map(Number);
            if (r === rowIndex) {
                toDelete.push(key);
            } else if (r > rowIndex) {
                moves.push({
                    oldKey: key,
                    newKey: `${r - 1},${c}`,
                    cell
                });
                toDelete.push(key);
            }
        });

        toDelete.forEach(key => newSheet.cells.delete(key));
        moves.forEach(({ newKey, cell }) => newSheet.cells.set(newKey, cell));

        // 3. Update Merged Cells
        newSheet.mergedCells = newSheet.mergedCells.map(range => {
            if (range.startRow > rowIndex) {
                return { ...range, startRow: range.startRow - 1, endRow: range.endRow - 1 };
            } else if (range.endRow >= rowIndex) {
                // Range spans across the deletion point -> shrink it
                return { ...range, endRow: Math.max(range.startRow, range.endRow - 1) };
            }
            return range;
        }).filter(range => range.endRow >= range.startRow); // Remove invalid ranges

        return newSheet;
    }

    static insertCol(sheet: SheetData, colIndex: number): SheetData {
        const newSheet = { ...sheet };
        newSheet.colCount++;

        // 1. Shift Col Widths
        if (newSheet.colWidths) {
            const newColWidths: Record<number, number> = {};
            Object.entries(newSheet.colWidths).forEach(([key, width]) => {
                const c = parseInt(key);
                if (c >= colIndex) {
                    newColWidths[c + 1] = width;
                } else {
                    newColWidths[c] = width;
                }
            });
            newSheet.colWidths = newColWidths;
        }

        // 2. Shift Cells
        const moves: { oldKey: string, newKey: string, cell: CellValue }[] = [];
        const toDelete: string[] = [];

        newSheet.cells.forEach((cell, key) => {
            const [r, c] = key.split(',').map(Number);
            if (c >= colIndex) {
                moves.push({
                    oldKey: key,
                    newKey: `${r},${c + 1}`,
                    cell
                });
                toDelete.push(key);
            }
        });

        toDelete.forEach(key => newSheet.cells.delete(key));
        moves.forEach(({ newKey, cell }) => newSheet.cells.set(newKey, cell));

        // 3. Update Merged Cells
        newSheet.mergedCells = newSheet.mergedCells.map(range => {
            if (range.startCol >= colIndex) {
                return { ...range, startCol: range.startCol + 1, endCol: range.endCol + 1 };
            } else if (range.endCol >= colIndex) {
                return { ...range, endCol: range.endCol + 1 };
            }
            return range;
        });

        return newSheet;
    }

    static deleteCol(sheet: SheetData, colIndex: number): SheetData {
        const newSheet = { ...sheet };
        newSheet.colCount = Math.max(0, newSheet.colCount - 1);

        // 1. Shift Col Widths
        if (newSheet.colWidths) {
            const newColWidths: Record<number, number> = {};
            Object.entries(newSheet.colWidths).forEach(([key, width]) => {
                const c = parseInt(key);
                if (c === colIndex) return;
                if (c > colIndex) {
                    newColWidths[c - 1] = width;
                } else {
                    newColWidths[c] = width;
                }
            });
            newSheet.colWidths = newColWidths;
        }

        // 2. Shift Cells
        const moves: { oldKey: string, newKey: string, cell: CellValue }[] = [];
        const toDelete: string[] = [];

        newSheet.cells.forEach((cell, key) => {
            const [r, c] = key.split(',').map(Number);
            if (c === colIndex) {
                toDelete.push(key);
            } else if (c > colIndex) {
                moves.push({
                    oldKey: key,
                    newKey: `${r},${c - 1}`,
                    cell
                });
                toDelete.push(key);
            }
        });

        toDelete.forEach(key => newSheet.cells.delete(key));
        moves.forEach(({ newKey, cell }) => newSheet.cells.set(newKey, cell));

        // 3. Update Merged Cells
        newSheet.mergedCells = newSheet.mergedCells.map(range => {
            if (range.startCol > colIndex) {
                return { ...range, startCol: range.startCol - 1, endCol: range.endCol - 1 };
            } else if (range.endCol >= colIndex) {
                return { ...range, endCol: Math.max(range.startCol, range.endCol - 1) };
            }
            return range;
        }).filter(range => range.endCol >= range.startCol);

        return newSheet;
    }

    static clearContent(sheet: SheetData, range: Range): SheetData {
        const newSheet = { ...sheet };
        const { startRow, endRow, startCol, endCol } = range;
        
        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                newSheet.cells.delete(`${r},${c}`);
            }
        }
        return newSheet;
    }

    static mergeCells(sheet: SheetData, range: Range): SheetData {
        const newSheet = { ...sheet };
        // Remove any existing merges that intersect with the new range
        newSheet.mergedCells = newSheet.mergedCells.filter(m => 
            !(m.endRow >= range.startRow && m.startRow <= range.endRow && 
              m.endCol >= range.startCol && m.startCol <= range.endCol)
        );
        // Add new merge
        newSheet.mergedCells = [...newSheet.mergedCells, range];
        return newSheet;
    }

    static unmergeCells(sheet: SheetData, range: Range): SheetData {
        const newSheet = { ...sheet };
        // Remove any merges that intersect with the selection
        newSheet.mergedCells = newSheet.mergedCells.filter(m => 
            !(m.endRow >= range.startRow && m.startRow <= range.endRow && 
              m.endCol >= range.startCol && m.startCol <= range.endCol)
        );
        return newSheet;
    }

    static getMergedRange(sheet: SheetData, row: number, col: number): Range | null {
        return sheet.mergedCells.find(m => 
            row >= m.startRow && row <= m.endRow && 
            col >= m.startCol && col <= m.endCol
        ) || null;
    }
}
