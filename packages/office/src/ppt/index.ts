import { PPTStore } from './core/store';
import { CommandBus } from './core/command';
import { ElementRegistry } from './core/registry';
import { PresentationState } from './model/schema';
import { AgentAPI } from './agent/api';
import { PPTXExporter } from './io/exporter';
import { PPTXParser } from './parser/pptx-parser';

export class PPTKernel {
  public store: PPTStore;
  public commandBus: CommandBus;
  public registry: ElementRegistry;
  public agent: AgentAPI;
  public exporter: PPTXExporter;
  public parser: PPTXParser;

  constructor(initialState?: Partial<PresentationState>) {
    this.store = new PPTStore(initialState);
    this.commandBus = new CommandBus(this.store);
    this.registry = ElementRegistry.getInstance();
    this.agent = new AgentAPI(this);
    this.exporter = new PPTXExporter();
    this.parser = new PPTXParser();
  }
  
  getState(): PresentationState {
    return this.store.getState();
  }

  async load(data: ArrayBuffer | Buffer) {
    const parsed = await this.parser.parse(data);
    this.store.setState(s => ({
        ...s,
        ...parsed
    }));
  }

  async export(): Promise<ArrayBuffer> {
    return this.exporter.export(this.store.getState());
  }
}

export * from './model/schema';
export * from './core/store';
export * from './core/command';
export * from './core/commands';
export * from './core/registry';
export * from './agent/api';
export * from './io/exporter';
export * from './parser/pptx-parser';
export * from './tools';
