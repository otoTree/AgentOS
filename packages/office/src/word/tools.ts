import { z } from 'zod';
import { WordKernel } from './core/kernel';
import { AgentCapabilityPlugin } from './plugins/agent';
import { Tool } from '@agentos/global';
import { DocumentState } from './model/schema';

export type WordDocumentStorage = {
    load(id: string): Promise<DocumentState>;
    save(id: string, state: DocumentState): Promise<void>;
}

export const createWordTools = (storage: WordDocumentStorage): Tool[] => {
    return [
        {
            name: 'word_read',
            description: 'Read the content of a Word document as Markdown',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                return (kernel as any).agent.toMarkdown();
            }
        },
        {
            name: 'word_get_outline',
            description: 'Get the outline (headings) of the document',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                return (kernel as any).agent.getOutline();
            }
        },
        {
            name: 'word_insert',
            description: 'Insert text into the document at a specific path',
            parameters: z.object({
                docId: z.string(),
                path: z.array(z.number()).describe('Path to insert at (e.g., [0] for beginning, [1] for second block)'),
                text: z.string().describe('Text content to insert')
            }),
            execute: async ({ docId, path, text }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                await kernel.exec({
                    type: 'agent:insert',
                    payload: { path, content: text }
                });
                
                await storage.save(docId, kernel.state);
                return { success: true };
            }
        },
        {
            name: 'word_delete',
            description: 'Delete content from the document at a specific path',
            parameters: z.object({
                docId: z.string(),
                path: z.array(z.number()).describe('Path to delete')
            }),
            execute: async ({ docId, path }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                await kernel.exec({
                    type: 'agent:delete',
                    payload: { path }
                });
                
                await storage.save(docId, kernel.state);
                return { success: true };
            }
        },
        {
            name: 'word_update_props',
            description: 'Update properties of a node at a specific path',
            parameters: z.object({
                docId: z.string(),
                path: z.array(z.number()).describe('Path to the node'),
                props: z.record(z.any()).describe('Properties to update')
            }),
            execute: async ({ docId, path, props }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                await kernel.exec({
                    type: 'agent:updateProps',
                    payload: { path, props }
                });
                
                await storage.save(docId, kernel.state);
                return { success: true };
            }
        },
        {
            name: 'word_apply_formatting',
            description: 'Apply formatting (marks) to text at a specific path',
            parameters: z.object({
                docId: z.string(),
                path: z.array(z.number()).describe('Path to the node'),
                marks: z.array(z.string()).describe('Marks to apply (bold, italic, underline, etc.)'),
                mode: z.enum(['add', 'remove']).optional().describe('Whether to add or remove marks. Default is add.')
            }),
            execute: async ({ docId, path, marks, mode }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                await kernel.exec({
                    type: 'agent:applyFormatting',
                    payload: { path, marks, mode }
                });
                
                await storage.save(docId, kernel.state);
                return { success: true };
            }
        },
        {
            name: 'word_table_to_json',
            description: 'Convert a table in the document to a JSON 2D array',
            parameters: z.object({
                docId: z.string(),
                tableId: z.string().describe('ID of the table node')
            }),
            execute: async ({ docId, tableId }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                return (kernel as any).agent.tableToJson(tableId);
            }
        },
        {
            name: 'word_insert_table',
            description: 'Insert a table from JSON data at a specific path',
            parameters: z.object({
                docId: z.string(),
                path: z.array(z.number()).describe('Path to insert at'),
                data: z.array(z.array(z.string())).describe('2D array of strings representing table content')
            }),
            execute: async ({ docId, path, data }) => {
                const state = await storage.load(docId);
                const kernel = new WordKernel({ initialState: state });
                const plugin = new AgentCapabilityPlugin();
                kernel.plugins.register(plugin);
                
                // 1. Generate Table Node
                const tableNode = (kernel as any).agent.jsonToTable(data);
                
                // 2. Insert Table Node
                await kernel.exec({
                    type: 'agent:insert',
                    payload: { path, content: tableNode }
                });
                
                await storage.save(docId, kernel.state);
                return { success: true };
            }
        },
        {
            name: 'word_undo',
            description: 'Undo the last operation',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                // WARNING: This is tricky because `storage.load` loads the CURRENT state.
                // The `WordKernel` here is ephemeral. It doesn't persist memory across tool calls.
                // So `undoStack` in `CommandBus` will be empty every time we init `WordKernel`.
                // 
                // To support Undo in this stateless architecture, we need to store history in the Storage layer (DB).
                // Or, simply, this architecture DOES NOT support Undo across sessions/tool calls.
                // 
                // However, user requested Undo/Redo in CommandBus.
                // If the Agent performs multiple operations in ONE session (keeping Kernel alive), it works.
                // But `createWordTools` creates a NEW Kernel for each tool call.
                // 
                // So exposing `word_undo` here is actually MISLEADING and WON'T WORK as expected unless we change storage to store history.
                // 
                // Decision: Do NOT expose `word_undo` in this stateless toolset for now.
                // Instead, rely on Agent to carefully plan or use `delete`/inverse ops if needed.
                // Or, if we really want it, we need `DocumentHistory` storage.
                // For now, I will skip exposing `word_undo` to avoid confusion, but keep the implementation in `CommandBus` for future stateful sessions (e.g. WebSocket collaborative editing).
                return { success: false, message: "Undo not supported in stateless mode yet." };
            }
        }
    ];
};
