import { describe, it, expect, vi } from 'vitest';
import { DocxParserPlugin } from '../src/word/plugins/parser';
import * as mammoth from 'mammoth';

vi.mock('mammoth', () => ({
  convertToHtml: vi.fn(),
  extractRawText: vi.fn()
}));

describe('DocxParserPlugin', () => {
    it('should parse HTML to Schema correctly', async () => {
        const plugin = new DocxParserPlugin();
        const mockHtml = `
            <h1>Title</h1>
            <p>Paragraph <strong>bold</strong></p>
            <ul><li>Item 1</li><li>Item 2</li></ul>
            <table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>
        `;
        
        (mammoth.convertToHtml as any).mockResolvedValue({
            value: mockHtml,
            messages: []
        });

        const kernel = { importDocx: null, exportDocx: null };
        plugin.onInit(kernel);

        // @ts-ignore
        const state = await kernel.importDocx(Buffer.from(''));
        
        expect(state.content).toHaveLength(4);
        expect(state.content[0].type).toBe('heading');
        expect(state.content[0].props.level).toBe(1);
        expect(state.content[1].type).toBe('paragraph');
        // Paragraph children: "Paragraph " (text), "bold" (text with bold mark)
        // Actually my parser handles "Paragraph " then "bold"
        // Wait, htmlparser2 might split text nodes?
        // Let's check structure.
        // <p>Paragraph <strong>bold</strong></p>
        // children: text("Paragraph "), tag("strong", children: text("bold"))
        // parserInline returns: {text: "Paragraph "}, {text: "bold", marks: ['bold']}
        
        expect(state.content[1].children).toHaveLength(2);
        expect(state.content[1].children[1].marks).toContain('bold');
        
        expect(state.content[2].type).toBe('list');
        expect(state.content[2].children).toHaveLength(2);
        
        expect(state.content[3].type).toBe('table');
        expect(state.content[3].children[0].children).toHaveLength(2);
    });
});
