import { SheetData, CellValue, Range } from '../model/schema';
import { FormulaParser } from '../engine/parser';
import { DependencyGraph } from '../engine/dependency-graph';
import { FunctionLibrary } from '../engine/functions';

export class SheetController {
    // We need a persistent graph for the sheet. 
    // Ideally this should be stored within SheetData or a separate manager, 
    // but for now we'll attach it statically or recreate it.
    // For simplicity in this functional style, we'll re-evaluate relevant chains.
    // A proper implementation would have a stateful Controller instance holding the Graph.
    
    // For MVP, we will do a simple recursive update on setCell.
    
    static updateCell(sheet: SheetData, row: number, col: number, rawValue: string | null): SheetData {
        const newSheet = { ...sheet };
        // Shallow copy map to trigger reactivity
        newSheet.cells = new Map(sheet.cells); 
        
        const key = `${row},${col}`;
        const cell = newSheet.cells.get(key) || { v: null };
        
        // 1. Update own value
        if (rawValue && rawValue.startsWith('=')) {
            cell.f = rawValue;
            // Calculate initial value
            const result = this.evaluateFormula(rawValue, newSheet);
            cell.v = result;
        } else {
            cell.f = undefined;
            // Try to parse number
            const num = Number(rawValue);
            cell.v = (rawValue !== null && rawValue !== '' && !isNaN(num)) ? num : rawValue;
        }
        
        newSheet.cells.set(key, cell);

        // 2. Update Dependencies (Naive approach: re-evaluate all formulas)
        // In a real app, use DependencyGraph to find dependents.
        // Optimization: We can scan all cells with formulas.
        
        // Let's implement a simple multi-pass evaluation or just re-evaluate all formulas once
        // For better correctness, we should topological sort, but for MVP, we iterate.
        this.recalculateAll(newSheet);

        return newSheet;
    }

    private static evaluateFormula(formula: string, sheet: SheetData): string | number | null {
        const parsed = FormulaParser.parse(formula);
        if (!parsed) return '#ERROR!';
        
        return FunctionLibrary.execute(parsed.functionName, parsed.args, sheet);
    }

    private static recalculateAll(sheet: SheetData) {
        // Simple double pass to handle 1-level dependencies
        // A real graph is needed for deep chains.
        for (let i = 0; i < 3; i++) { // Max depth 3 for MVP
            let changed = false;
            sheet.cells.forEach((cell, key) => {
                if (cell.f) {
                    const newValue = this.evaluateFormula(cell.f, sheet);
                    if (newValue !== cell.v) {
                        cell.v = newValue;
                        changed = true;
                    }
                }
            });
            if (!changed) break;
        }
    }

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
