# @agentos/office

AgentOS Office Core Module.

## Word Kernel

The Word Kernel is a micro-kernel architecture for processing Word documents, designed for AgentOS.

### Features

- **Micro-kernel**: Core state management and command bus.
- **Schema**: Tree-based JSON document model.
- **Plugins**: Extensible plugin system.
  - `docx-parser`: Import/Export .docx files (powered by mammoth and docx).

### Usage

```typescript
import { WordKernel, DocxParserPlugin } from '@agentos/office';
import * as fs from 'fs';

// Initialize Kernel
const kernel = new WordKernel({
  plugins: [new DocxParserPlugin()]
});

// Import
const buffer = fs.readFileSync('document.docx');
const state = await (kernel as any).importDocx(buffer);

console.log(state);

// Modify State (via Commands - TODO)
// kernel.exec({ type: 'insert', payload: ... });

// Export
const newBuffer = await (kernel as any).exportDocx(state);
fs.writeFileSync('output.docx', newBuffer);
```

## Architecture

- `src/word/core`: Kernel, CommandBus, PluginManager
- `src/word/model`: Document Schema
- `src/word/plugins`: Built-in plugins
