export interface WordPlugin {
  name: string;
  onInit?(kernel: any): void;
  onDestroy?(): void;
}

export class PluginManager {
  private plugins: Map<string, WordPlugin> = new Map();
  private kernel: any;

  constructor(kernel: any) {
    this.kernel = kernel;
  }

  register(plugin: WordPlugin) {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} already registered.`);
      return;
    }
    this.plugins.set(plugin.name, plugin);
    plugin.onInit?.(this.kernel);
  }

  unregister(pluginName: string) {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.onDestroy?.();
      this.plugins.delete(pluginName);
    }
  }

  get(pluginName: string) {
    return this.plugins.get(pluginName);
  }
}
