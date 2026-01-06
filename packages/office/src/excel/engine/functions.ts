import { SheetData, CellValue } from '../model/schema';
import { DependencyGraph } from './dependency-graph';

export class FunctionLibrary {
    static execute(functionName: string, args: string[], sheet: SheetData): number | string | null {
        switch (functionName) {
            case 'SUM':
                return this.SUM(args, sheet);
            case 'AVG':
            case 'AVERAGE':
                return this.AVG(args, sheet);
            case 'COUNT':
                return this.COUNT(args, sheet);
            case 'MIN':
                return this.MIN(args, sheet);
            case 'MAX':
                return this.MAX(args, sheet);
            default:
                return '#NAME?';
        }
    }

    private static getValuesFromArgs(args: string[], sheet: SheetData): number[] {
        const values: number[] = [];
        
        args.forEach(arg => {
            // Check if it's a range (contains :)
            if (arg.includes(':')) {
                const keys = DependencyGraph.parseRangeToKeys(arg);
                keys.forEach(key => {
                    const cell = sheet.cells.get(key);
                    if (cell && cell.v !== null) {
                         const num = Number(cell.v);
                         if (!isNaN(num)) values.push(num);
                    }
                });
            } else if (arg.match(/^[A-Z]+[0-9]+$/)) {
                 // Single cell ref
                 const key = DependencyGraph.parseCellToKey(arg);
                 const cell = sheet.cells.get(key);
                 if (cell && cell.v !== null) {
                     const num = Number(cell.v);
                     if (!isNaN(num)) values.push(num);
                 }
            } else {
                // Literal number
                const num = Number(arg);
                if (!isNaN(num)) values.push(num);
            }
        });
        
        return values;
    }

    static SUM(args: string[], sheet: SheetData): number {
        const values = this.getValuesFromArgs(args, sheet);
        return values.reduce((a, b) => a + b, 0);
    }

    static AVG(args: string[], sheet: SheetData): number {
        const values = this.getValuesFromArgs(args, sheet);
        if (values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    static COUNT(args: string[], sheet: SheetData): number {
        const values = this.getValuesFromArgs(args, sheet);
        return values.length;
    }

    static MIN(args: string[], sheet: SheetData): number {
        const values = this.getValuesFromArgs(args, sheet);
        if (values.length === 0) return 0;
        return Math.min(...values);
    }

    static MAX(args: string[], sheet: SheetData): number {
        const values = this.getValuesFromArgs(args, sheet);
        if (values.length === 0) return 0;
        return Math.max(...values);
    }
}
