import { SheetData } from '../model/schema';
import { Command } from './interface';

export class HistoryManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];

    public execute(sheet: SheetData, command: Command): SheetData {
        const newSheet = command.execute(sheet);
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action
        return newSheet;
    }

    public undo(sheet: SheetData): SheetData | null {
        const command = this.undoStack.pop();
        if (!command) return null;

        const newSheet = command.undo(sheet);
        this.redoStack.push(command);
        return newSheet;
    }

    public redo(sheet: SheetData): SheetData | null {
        const command = this.redoStack.pop();
        if (!command) return null;

        const newSheet = command.execute(sheet);
        this.undoStack.push(command);
        return newSheet;
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}
