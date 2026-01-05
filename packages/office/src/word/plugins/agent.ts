import { WordPlugin } from '../core/plugin';
import { WordKernel } from '../core/kernel';
import { BlockNode, InlineNode, Path, DocumentState } from '../model/schema';
import { v4 as uuidv4 } from 'uuid';

export class AgentCapabilityPlugin implements WordPlugin {
  name = 'agent-capability';

  onInit(kernel: WordKernel) {
    kernel.commandBus.on('agent:insert', this.insert.bind(this));
    kernel.commandBus.on('agent:delete', this.delete.bind(this));
    kernel.commandBus.on('agent:updateProps', this.updateProps.bind(this));
    kernel.commandBus.on('agent:applyFormatting', this.applyFormatting.bind(this));
    
    (kernel as any).agent = {
        getOutline: () => this.getOutline(kernel.state),
        toMarkdown: () => this.toMarkdown(kernel.state),
        tableToJson: (tableId: string) => this.tableToJson(tableId, kernel.state),
        jsonToTable: (data: string[][]) => this.jsonToTable(data)
    };
  }

  private resolvePath(state: DocumentState, path: Path): { parent: any, index: number, node: any } | null {
      // Root is special
      let current: any = { children: state.content };
      
      for (let i = 0; i < path.length; i++) {
          const idx = path[i];
          if (!current.children || !current.children[idx]) return null;
          current = current.children[idx];
      }
      
      return { parent: null, index: path[path.length - 1], node: current };
  }
  
  // A better traverse that returns the list to modify
  private getTargetList(state: DocumentState, path: Path): any[] {
      if (path.length === 0) return state.content;
      if (path.length === 1) return state.content;
      
      let current: any = { children: state.content };
      for (let i = 0; i < path.length - 1; i++) {
          const idx = path[i];
          if (!current.children || !current.children[idx]) throw new Error(`Path not found: ${path.slice(0, i+1)}`);
          current = current.children[idx];
      }
      
      if (!current.children) current.children = [];
      return current.children;
  }

  private insert({ path, content }: { path: Path, content: BlockNode | InlineNode | string }, kernel: WordKernel) {
      const state = JSON.parse(JSON.stringify(kernel.state));
      const targetList = this.getTargetList(state, path);
      const index = path[path.length - 1];
      
      let nodeToInsert: any = content;
      if (typeof content === 'string') {
          // Default to paragraph
          nodeToInsert = {
              type: 'paragraph',
              id: uuidv4(),
              props: {},
              children: [{ type: 'text', text: content, marks: [] }]
          };
      } else if (!nodeToInsert.id && nodeToInsert.type !== 'text') {
          nodeToInsert.id = uuidv4();
      }

      targetList.splice(index, 0, nodeToInsert);
      kernel.setState(state);
  }
  
  private delete({ path }: { path: Path }, kernel: WordKernel) {
      const state = JSON.parse(JSON.stringify(kernel.state));
      const targetList = this.getTargetList(state, path);
      const index = path[path.length - 1];
      
      if (index >= 0 && index < targetList.length) {
          targetList.splice(index, 1);
          kernel.setState(state);
      }
  }

  private updateProps({ path, props }: { path: Path, props: any }, kernel: WordKernel) {
       const state = JSON.parse(JSON.stringify(kernel.state));
       // Need to find the exact node
       let current: any = { children: state.content };
       for (let i = 0; i < path.length; i++) {
          const idx = path[i];
          if (!current.children || !current.children[idx]) throw new Error(`Node not found at path: ${path}`);
          current = current.children[idx];
       }
       
       current.props = { ...current.props, ...props };
       kernel.setState(state);
  }

  private replaceContent({ path, text }: { path: Path, text: string }, kernel: WordKernel) {
       const state = JSON.parse(JSON.stringify(kernel.state));
       let current: any = { children: state.content };
       for (let i = 0; i < path.length; i++) {
          const idx = path[i];
          if (!current.children || !current.children[idx]) throw new Error(`Node not found at path: ${path}`);
          current = current.children[idx];
       }
       
       // Replace children with simple text node
       // Note: This wipes out existing formatting/marks!
       // For a robust editor, we need diffing, but for this simple block editor, it's acceptable.
       current.children = [{
           type: 'text',
           text: text,
           marks: []
       }];
       
       kernel.setState(state);
  }

  private applyFormatting({ path, marks, mode = 'add' }: { path: Path, marks: string[], mode?: 'add' | 'remove' }, kernel: WordKernel) {
      const state = JSON.parse(JSON.stringify(kernel.state));
      // Find node
      let current: any = { children: state.content };
      for (let i = 0; i < path.length; i++) {
         const idx = path[i];
         if (!current.children || !current.children[idx]) throw new Error(`Node not found at path: ${path}`);
         current = current.children[idx];
      }
      
      const applyToNode = (node: any) => {
          if (node.type === 'text') {
              const currentMarks = new Set(node.marks || []);
              marks.forEach(m => {
                  if (mode === 'add') currentMarks.add(m);
                  else currentMarks.delete(m);
              });
              node.marks = Array.from(currentMarks);
          } else if (node.children) {
              node.children.forEach(applyToNode);
          }
      };
      
      applyToNode(current);
      kernel.setState(state);
  }
  
  private tableToJson(tableId: string, state: DocumentState): string[][] | null {
      // BFS to find table
      const queue: any[] = [...state.content];
      while (queue.length > 0) {
          const node = queue.shift();
          if (node.id === tableId && node.type === 'table') {
              // Found table
              return node.children.map((row: any) => {
                  return row.children.map((cell: any) => {
                      // Extract text from cell
                      return this.extractText(cell);
                  });
              });
          }
          if (node.children) {
              queue.push(...node.children);
          }
      }
      return null;
  }
  
  private jsonToTable(data: string[][]): BlockNode {
      return {
          type: 'table',
          id: uuidv4(),
          props: {},
          children: data.map(row => ({
              type: 'table-row',
              id: uuidv4(),
              props: {},
              children: row.map(cellText => ({
                  type: 'table-cell',
                  id: uuidv4(),
                  props: {},
                  children: [{
                      type: 'paragraph',
                      id: uuidv4(),
                      props: {},
                      children: [{ type: 'text', text: cellText, marks: [] }]
                  }]
              }))
          }))
      } as BlockNode;
  }
  
  private extractText(node: any): string {
      if (node.type === 'text') return node.text;
      if (node.children) return node.children.map((c: any) => this.extractText(c)).join('');
      return '';
  }
  
  private getOutline(state: DocumentState) {
      return state.content
        .filter(b => b.type === 'heading')
        .map(b => ({ 
            text: (b.children[0] as any)?.text || '', 
            level: b.props.level || 1,
            id: b.id
        }));
  }
  
  private toMarkdown(state: DocumentState) {
      return state.content.map(block => this.blockToMarkdown(block)).join('\n\n');
  }

  private blockToMarkdown(block: BlockNode): string {
      const text = block.children ? block.children.map((c: any) => c.text || '').join('') : '';
      
      switch (block.type) {
          case 'heading':
              return '#'.repeat(block.props.level || 1) + ' ' + text;
          case 'paragraph':
              return text;
          case 'list':
              return block.children.map(li => `- ${this.blockToMarkdown(li as BlockNode)}`).join('\n');
          case 'list-item':
              return text;
          case 'table':
              // Simple markdown table support
              // Assuming first row is header if exists, or just grid
              if (!block.children || block.children.length === 0) return '';
              const rows = block.children.map((row: any) => {
                  return '| ' + row.children.map((cell: any) => {
                      return cell.children.map((c: any) => c.children?.map((t: any) => t.text).join('') || '').join(' ');
                  }).join(' | ') + ' |';
              });
              // Add separator after first row
              if (rows.length > 0) {
                  const colCount = (block.children[0] as any).children.length;
                  const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
                  rows.splice(1, 0, separator);
              }
              return rows.join('\n');
          case 'image':
              return `![${block.props.alt || 'image'}](${block.props.src || ''})`;
          default:
              return text;
      }
  }
}
