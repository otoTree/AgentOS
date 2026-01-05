import { SheetData } from '../model/schema';

export class SizeManager {
    private defaultColWidth = 100;
    private defaultRowHeight = 25;
    private sheet: SheetData;

    constructor(sheet: SheetData, defaultColWidth = 100, defaultRowHeight = 25) {
        this.sheet = sheet;
        this.defaultColWidth = defaultColWidth;
        this.defaultRowHeight = defaultRowHeight;
    }

    updateSheet(sheet: SheetData) {
        this.sheet = sheet;
    }

    getColWidth(col: number): number {
        return this.sheet.colWidths?.[col] ?? this.defaultColWidth;
    }

    getRowHeight(row: number): number {
        return this.sheet.rowHeights?.[row] ?? this.defaultRowHeight;
    }

    getColOffset(col: number): number {
        let offset = 0;
        for (let i = 0; i < col; i++) {
            offset += this.getColWidth(i);
        }
        return offset;
    }

    getRowOffset(row: number): number {
        let offset = 0;
        for (let i = 0; i < row; i++) {
            offset += this.getRowHeight(i);
        }
        return offset;
    }

    getTotalWidth(): number {
        return this.getColOffset(this.sheet.colCount);
    }

    getTotalHeight(): number {
        return this.getRowOffset(this.sheet.rowCount);
    }

    getColIndexAtOffset(offset: number): number {
        let currentOffset = 0;
        for (let i = 0; i < this.sheet.colCount; i++) {
            const width = this.getColWidth(i);
            if (currentOffset + width > offset) {
                return i;
            }
            currentOffset += width;
        }
        return this.sheet.colCount - 1;
    }

    getRowIndexAtOffset(offset: number): number {
        let currentOffset = 0;
        for (let i = 0; i < this.sheet.rowCount; i++) {
            const height = this.getRowHeight(i);
            if (currentOffset + height > offset) {
                return i;
            }
            currentOffset += height;
        }
        return this.sheet.rowCount - 1;
    }
}
