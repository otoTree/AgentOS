import { Command } from './interface';
import { SheetData, Range } from '../model/schema';
import { SheetController } from '../core/sheet-controller';

export class SetCellCommand implements Command {
    constructor(
        private row: number, 
        private col: number, 
        private newValue: string | null,
        private oldValue: string | null
    ) {}

    execute(sheet: SheetData): SheetData {
        const newSheet = { ...sheet };
        newSheet.cells = new Map(sheet.cells);
        const key = `${this.row},${this.col}`;
        const cell = newSheet.cells.get(key) || { v: null };
        newSheet.cells.set(key, { ...cell, v: this.newValue });
        return newSheet;
    }

    undo(sheet: SheetData): SheetData {
        const newSheet = { ...sheet };
        newSheet.cells = new Map(sheet.cells);
        const key = `${this.row},${this.col}`;
        const cell = newSheet.cells.get(key) || { v: null };
        newSheet.cells.set(key, { ...cell, v: this.oldValue });
        return newSheet;
    }
}

export class MergeCellsCommand implements Command {
    private previousMergedCells: Range[] = [];

    constructor(private range: Range) {}

    execute(sheet: SheetData): SheetData {
        this.previousMergedCells = [...sheet.mergedCells];
        return SheetController.mergeCells(sheet, this.range);
    }

    undo(sheet: SheetData): SheetData {
        const newSheet = { ...sheet };
        newSheet.mergedCells = this.previousMergedCells;
        return newSheet;
    }
}

export class UnmergeCellsCommand implements Command {
    private previousMergedCells: Range[] = [];

    constructor(private range: Range) {}

    execute(sheet: SheetData): SheetData {
        this.previousMergedCells = [...sheet.mergedCells];
        return SheetController.unmergeCells(sheet, this.range);
    }

    undo(sheet: SheetData): SheetData {
        const newSheet = { ...sheet };
        newSheet.mergedCells = this.previousMergedCells;
        return newSheet;
    }
}
