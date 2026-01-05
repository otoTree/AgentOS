import { DocumentState, Selection } from '../model/schema';
import { CommandBus, Command } from './command';
import { PluginManager, WordPlugin } from './plugin';
import { v4 as uuidv4 } from 'uuid';

export type KernelConfig = {
  initialState?: DocumentState;
  plugins?: WordPlugin[];
}

export class WordKernel {
  public state: DocumentState;
  public selection: Selection | null = null;
  public commandBus: CommandBus;
  public plugins: PluginManager;
  private listeners: ((state: DocumentState) => void)[] = [];

  constructor(config: KernelConfig = {}) {
    this.state = config.initialState || this.createEmptyState();
    this.commandBus = new CommandBus(this);
    this.plugins = new PluginManager(this);

    if (config.plugins) {
      config.plugins.forEach(p => this.plugins.register(p));
    }
  }

  private createEmptyState(): DocumentState {
    return {
      uid: uuidv4(),
      metadata: {},
      content: []
    };
  }

  public exec(command: Command) {
    return this.commandBus.execute(command);
  }
  
  public setState(newState: DocumentState) {
      this.state = newState;
      this.notify();
  }
  
  public setSelection(newSelection: Selection | null) {
      this.selection = newSelection;
      // Note: currently only notifying on state change, but might need to notify on selection change too
      // For now, let's trigger update
      this.notify();
  }
  
  public getState() {
      return this.state;
  }

  public subscribe(listener: (state: DocumentState) => void) {
      this.listeners.push(listener);
      return () => {
          this.listeners = this.listeners.filter(l => l !== listener);
      };
  }

  private notify() {
      this.listeners.forEach(l => l(this.state));
  }
}
