import { ElementType, Element } from '../model/schema';

export type ElementDefinition = {
  type: ElementType;
  /**
   * Create a default instance of this element type
   */
  createDefault: (id: string) => Element;
}

export class ElementRegistry {
  private static instance: ElementRegistry;
  private definitions: Map<ElementType, ElementDefinition> = new Map();

  private constructor() {}

  static getInstance(): ElementRegistry {
    if (!ElementRegistry.instance) {
      ElementRegistry.instance = new ElementRegistry();
    }
    return ElementRegistry.instance;
  }

  register(definition: ElementDefinition) {
    this.definitions.set(definition.type, definition);
  }

  get(type: ElementType): ElementDefinition | undefined {
    return this.definitions.get(type);
  }

  create(type: ElementType, id: string): Element {
    const def = this.get(type);
    if (!def) {
      throw new Error(`Element type ${type} not registered`);
    }
    return def.createDefault(id);
  }
}
