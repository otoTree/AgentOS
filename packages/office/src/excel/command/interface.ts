import { SheetData } from '../model/schema';

export type Command = {
    execute(sheet: SheetData): SheetData;
    undo(sheet: SheetData): SheetData;
}
