export type Command<T = any> = {
  type: string;
  payload: T;
}

export type CommandHandler<T = any> = (payload: T, context: any) => void | Promise<void>;

export class CommandBus {
  private handlers: Map<string, CommandHandler[]> = new Map();
  private history: Command[] = []; 
  private undoStack: any[] = [];
  private redoStack: any[] = [];
  private readonly MAX_HISTORY = 50;
  private context: any;

  constructor(context: any) {
    this.context = context;
  }

  on<T>(type: string, handler: CommandHandler<T>) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  off<T>(type: string, handler: CommandHandler<T>) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      this.handlers.set(type, handlers.filter(h => h !== handler));
    }
  }

  async execute<T>(command: Command<T>) {
    const handlers = this.handlers.get(command.type);
    if (!handlers || handlers.length === 0) {
      console.warn(`No handlers for command: ${command.type}`);
      return;
    }
    
    // Save state for undo before execution
    // Assuming context has getState/setState which WordKernel does
    if (this.context.getState) {
        const currentState = JSON.parse(JSON.stringify(this.context.getState()));
        this.undoStack.push(currentState);
        if (this.undoStack.length > this.MAX_HISTORY) {
            this.undoStack.shift();
        }
        // Clear redo stack on new action
        this.redoStack = [];
    }
    
    for (const handler of handlers) {
      await handler(command.payload, this.context);
    }
    
    this.history.push(command);
  }
  
  undo() {
      if (this.undoStack.length === 0 || !this.context.setState || !this.context.getState) return false;
      
      const currentState = JSON.parse(JSON.stringify(this.context.getState()));
      this.redoStack.push(currentState);
      
      const prevState = this.undoStack.pop();
      this.context.setState(prevState);
      return true;
  }
  
  redo() {
      if (this.redoStack.length === 0 || !this.context.setState || !this.context.getState) return false;
      
      const currentState = JSON.parse(JSON.stringify(this.context.getState()));
      this.undoStack.push(currentState);
      
      const nextState = this.redoStack.pop();
      this.context.setState(nextState);
      return true;
  }
  
  getHistory() {
      return this.history;
  }
}
