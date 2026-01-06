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
        return SheetController.updateCell(sheet, this.row, this.col, this.newValue);
    }

    undo(sheet: SheetData): SheetData {
        return SheetController.updateCell(sheet, this.row, this.col, this.oldValue);
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
