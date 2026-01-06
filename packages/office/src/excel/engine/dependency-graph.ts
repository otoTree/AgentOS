import { SheetData, CellValue } from '../model/schema';
import { indexToColumn, columnToIndex } from '../../shared/utils';

export class DependencyGraph {
    // Map cell key (e.g., "0,0") to list of cells that depend on it
    private dependencies: Map<string, Set<string>> = new Map();
    // Map cell key to the cells it references (inverse of dependencies)
    private references: Map<string, Set<string>> = new Map();

    addDependency(dependentCell: string, referencedCell: string) {
        if (!this.dependencies.has(referencedCell)) {
            this.dependencies.set(referencedCell, new Set());
        }
        this.dependencies.get(referencedCell)!.add(dependentCell);

        if (!this.references.has(dependentCell)) {
            this.references.set(dependentCell, new Set());
        }
        this.references.get(dependentCell)!.add(referencedCell);
    }

    clearDependencies(dependentCell: string) {
        const refs = this.references.get(dependentCell);
        if (refs) {
            refs.forEach(ref => {
                this.dependencies.get(ref)?.delete(dependentCell);
            });
            this.references.delete(dependentCell);
        }
    }

    getDependents(cell: string): string[] {
        return Array.from(this.dependencies.get(cell) || []);
    }

    // Helper to parse range "A1:B2" to cell keys ["0,0", "0,1", ...]
    static parseRangeToKeys(rangeStr: string): string[] {
        const parts = rangeStr.split(':');
        if (parts.length === 1) {
             return [this.parseCellToKey(parts[0])];
        }
        
        const start = this.parseCellToKey(parts[0]);
        const end = this.parseCellToKey(parts[1]);
        
        const [startR, startC] = start.split(',').map(Number);
        const [endR, endC] = end.split(',').map(Number);
        
        const keys: string[] = [];
        for (let r = startR; r <= endR; r++) {
            for (let c = startC; c <= endC; c++) {
                keys.push(`${r},${c}`);
            }
        }
        return keys;
    }

    static parseCellToKey(cellRef: string): string {
        // A1 -> 0,0
        const match = cellRef.match(/^([A-Z]+)([0-9]+)$/);
        if (!match) return "0,0"; // Fallback
        
        const colStr = match[1];
        const rowStr = match[2];
        
        const col = columnToIndex(colStr);
        const row = parseInt(rowStr) - 1;
        
        return `${row},${col}`;
    }
}
