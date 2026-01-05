import { describe, it, expect, beforeEach } from 'vitest';
import { WordKernel } from '../src/word/core/kernel';
import { AgentCapabilityPlugin } from '../src/word/plugins/agent';
import { BlockNode, DocumentState } from '../src/word/model/schema';
import { v4 as uuidv4 } from 'uuid';

describe('AgentCapabilityPlugin', () => {
    let kernel: WordKernel;
    let plugin: AgentCapabilityPlugin;

    beforeEach(() => {
        kernel = new WordKernel({
            initialState: {
                uid: 'test-doc',
                metadata: {},
                content: [
                    {
                        type: 'paragraph',
                        id: 'p1',
                        props: {},
                        children: [
                            { type: 'text', text: 'Hello World', marks: [] }
                        ]
                    }
                ]
            }
        });
        plugin = new AgentCapabilityPlugin();
        kernel.plugins.register(plugin);
    });

    it('should apply formatting to text', async () => {
        await kernel.exec({
            type: 'agent:applyFormatting',
            payload: {
                path: [0],
                marks: ['bold'],
                mode: 'add'
            }
        });

        const state = kernel.getState();
        const p1 = state.content[0];
        const textNode = p1.children[0] as any;
        expect(textNode.marks).toContain('bold');
    });

    it('should remove formatting from text', async () => {
        // Setup initial bold
        await kernel.exec({
            type: 'agent:applyFormatting',
            payload: { path: [0], marks: ['bold'], mode: 'add' }
        });
        
        // Remove bold
        await kernel.exec({
            type: 'agent:applyFormatting',
            payload: { path: [0], marks: ['bold'], mode: 'remove' }
        });

        const state = kernel.getState();
        const textNode = (state.content[0].children[0] as any);
        expect(textNode.marks).not.toContain('bold');
    });

    it('should convert table to json and back', async () => {
        const tableData = [
            ['Header 1', 'Header 2'],
            ['Row 1 Col 1', 'Row 1 Col 2']
        ];

        // Test jsonToTable
        const tableNode = (kernel as any).agent.jsonToTable(tableData);
        expect(tableNode.type).toBe('table');
        expect(tableNode.children.length).toBe(2);
        
        // Insert table
        await kernel.exec({
            type: 'agent:insert',
            payload: { path: [1], content: tableNode }
        });
        
        const state = kernel.getState();
        expect(state.content.length).toBe(2);
        const insertedTable = state.content[1];
        
        // Test tableToJson
        const extractedData = (kernel as any).agent.tableToJson(insertedTable.id);
        expect(extractedData).toEqual(tableData);
    });

    it('should support undo/redo via CommandBus', async () => {
        const initialState = JSON.stringify(kernel.getState());
        
        // Action 1: Insert paragraph
        await kernel.exec({
            type: 'agent:insert',
            payload: { path: [1], content: 'New Paragraph' }
        });
        
        expect(kernel.getState().content.length).toBe(2);
        
        // Undo
        const undoSuccess = kernel.commandBus.undo();
        expect(undoSuccess).toBe(true);
        expect(kernel.getState().content.length).toBe(1);
        expect(JSON.stringify(kernel.getState())).toBe(initialState);
        
        // Redo
        const redoSuccess = kernel.commandBus.redo();
        expect(redoSuccess).toBe(true);
        expect(kernel.getState().content.length).toBe(2);
        expect((kernel.getState().content[1].children[0] as any).text).toBe('New Paragraph');
    });
});
