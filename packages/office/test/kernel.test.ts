import { describe, it, expect, vi } from 'vitest';
import { WordKernel } from '../src/word/core/kernel';
import { DocxParserPlugin } from '../src/word/plugins/parser';

describe('WordKernel', () => {
  it('should initialize with default state', () => {
    const kernel = new WordKernel();
    expect(kernel.state).toBeDefined();
    expect(kernel.state.content).toEqual([]);
  });

  it('should register plugins', () => {
    const parserPlugin = new DocxParserPlugin();
    const kernel = new WordKernel({
      plugins: [parserPlugin]
    });
    
    // Check if methods are attached
    expect((kernel as any).importDocx).toBeDefined();
    expect((kernel as any).exportDocx).toBeDefined();
  });

  it('should execute commands', async () => {
    const kernel = new WordKernel();
    const handler = vi.fn();
    
    kernel.commandBus.on('test-command', handler);
    
    await kernel.exec({
      type: 'test-command',
      payload: { foo: 'bar' }
    });
    
    expect(handler).toHaveBeenCalledWith({ foo: 'bar' }, kernel);
    expect(kernel.commandBus.getHistory().length).toBe(1);
  });
});
