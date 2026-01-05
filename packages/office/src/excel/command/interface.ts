import { SheetData } from '../model/schema';

export interface Command {
    execute(sheet: SheetData): SheetData;
    undo(sheet: SheetData): SheetData;
}
