import { z } from 'zod';
import { Tool } from '@agentos/global';
import ExcelJS from 'exceljs';

export type ExcelDocumentStorage = {
    load(id: string): Promise<ArrayBuffer>;
    save(id: string, buffer: ArrayBuffer): Promise<void>;
}


export const createExcelTools = (storage: ExcelDocumentStorage): Tool[] => {
    return [
        {
            name: 'excel_read',
            description: 'Read the content of an Excel file as CSV-like text',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                const buffer = await storage.load(docId);
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                
                // Find first visible worksheet
                const worksheet = workbook.worksheets.find(s => s.state === 'visible') || workbook.worksheets[0];
                
                if (!worksheet) {
                    return "No visible worksheet found in the Excel file.";
                }

                const rows: string[] = [];
                
                // Add header info
                rows.push(`Sheet: ${worksheet.name}`);
                
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                     // ExcelJS values are 1-based, index 0 is undefined/empty
                     // row.values returns an array where index 0 is undefined.
                     // We need to handle this carefully.
                     
                     let values: any[] = [];
                     if (Array.isArray(row.values)) {
                         values = row.values.slice(1);
                     } else if (typeof row.values === 'object') {
                         // Sometimes it returns an object if columns are keyed, but usually array
                         values = Object.values(row.values);
                     }

                     const cleanValues = values.map(v => {
                         if (v === null || v === undefined) return '';
                         if (typeof v === 'object') {
                             // Handle formula result objects: { formula: '...', result: ... }
                             if ('result' in v) return v.result;
                             // Handle rich text
                             if ('richText' in v) return (v as any).richText.map((t: any) => t.text).join('');
                             // Handle text object
                             if ('text' in v) return (v as any).text;
                             // Handle hyperlink
                             if ('hyperlink' in v && 'text' in v) return (v as any).text;
                             
                             try {
                                return JSON.stringify(v);
                             } catch {
                                return '[Object]';
                             }
                         }
                         return String(v);
                     });
                     
                     rows.push(cleanValues.join(','));
                });
                
                return rows.join('\n');
            }
        },
        {
            name: 'excel_get_sheets',
            description: 'Get the list of sheet names in the Excel file',
            parameters: z.object({
                docId: z.string()
            }),
            execute: async ({ docId }) => {
                const buffer = await storage.load(docId);
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer);
                
                return workbook.worksheets.map(s => ({
                    name: s.name,
                    id: s.id,
                    state: s.state
                }));
            }
        }
    ];
};
