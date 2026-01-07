import { PPTStore } from './store';

export type Command = {
  execute(): void;
  undo(): void;
}

export class CommandBus {
  private history: Command[] = [];
  private historyIndex: number = -1;
  private store: PPTStore;

  constructor(store: PPTStore) {
    this.store = store;
  }

  execute(command: Command) {
    // If we are not at the end of history, remove future commands (redo stack)
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    try {
      command.execute();
      this.history.push(command);
      this.historyIndex++;
    } catch (error) {
      console.error('Command execution failed:', error);
      // Depending on requirements, we might want to rollback partial changes or throw
    }
  }

  undo() {
    if (this.canUndo()) {
      this.history[this.historyIndex].undo();
      this.historyIndex--;
    }
  }

  redo() {
    if (this.canRedo()) {
      this.historyIndex++;
      this.history[this.historyIndex].execute();
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }
}
