import ExcelJS from 'exceljs';
import { SheetData, CellValue, Range, Style } from '../model/schema';
import { indexToColumn } from '../../shared/utils';

export class ExcelAdapter {
  static async fileToSheetData(file: File | Blob): Promise<SheetData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // For MVP, just load the first visible sheet or the first one
    const worksheet = workbook.worksheets.find(s => s.state === 'visible') || workbook.worksheets[0];
    
    if (!worksheet) {
      throw new Error('No worksheets found in the Excel file');
    }

    return this.worksheetToSheetData(worksheet);
  }

  static worksheetToSheetData(worksheet: ExcelJS.Worksheet): SheetData {
    const cells = new Map<string, CellValue>();
    const styles: Record<string, Style> = {};
    const mergedCells: Range[] = [];
    const colWidths: Record<number, number> = {};
    const rowHeights: Record<number, number> = {};

    // 1. Parse Columns (Widths)
    if (worksheet.columns) {
        worksheet.columns.forEach((col, index) => {
             // ExcelJS width is in characters, approximate pixels ~7px per char + padding
             if (col.width) {
                 colWidths[index] = Math.round(col.width * 7.5); 
             }
        });
    }

    // 2. Parse Rows & Cells
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const rowIndex = rowNumber - 1; // 0-based
        
        if (row.height) {
            rowHeights[rowIndex] = row.height;
        }

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const colIndex = colNumber - 1; // 0-based
            const cellKey = `${rowIndex},${colIndex}`;
            
            // Value
            let v: any = cell.value;
            let f: string | undefined = undefined;

            if (cell.formula) {
                f = '=' + cell.formula;
                v = cell.result; // The cached result
            } else if (typeof v === 'object' && v !== null) {
                // Rich text or hyperlink, simplify for MVP
                if ('richText' in v) {
                    v = (v as any).richText.map((t: any) => t.text).join('');
                } else if ('text' in v) {
                    v = (v as any).text;
                }
            }

            // Style
            let styleId: string | undefined = undefined;
            if (cell.style) {
                const s: Style = {};
                if (cell.font) {
                    if (cell.font.bold) s.bold = true;
                    if (cell.font.italic) s.italic = true;
                    if (cell.font.size) s.fontSize = cell.font.size;
                    if (cell.font.name) s.fontFamily = cell.font.name;
                    if (cell.font.color && 'argb' in cell.font.color) {
                         s.color = '#' + (cell.font.color.argb as string).substring(2);
                    }
                }
                if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid') {
                    if (cell.fill.fgColor && 'argb' in cell.fill.fgColor) {
                        s.backgroundColor = '#' + (cell.fill.fgColor.argb as string).substring(2);
                    }
                }
                if (cell.alignment) {
                    if (cell.alignment.horizontal) s.align = cell.alignment.horizontal as any;
                    if (cell.alignment.vertical) s.valign = cell.alignment.vertical as any;
                }
                
                if (Object.keys(s).length > 0) {
                    styleId = JSON.stringify(s); // Simple dedupe
                    styles[styleId] = s;
                }
            }

            const cellValue: CellValue = { v };
            if (f) cellValue.f = f;
            if (styleId) cellValue.s = styleId;

            cells.set(cellKey, cellValue);
        });
    });

    // 3. Merged Cells
    // ExcelJS stores merges as "master" cell has address, others are merged
    // But we can get merges from worksheet.model or iterating
    // worksheet.model.merges is usually available
    const merges = (worksheet.model as any).merges || [];
    merges.forEach((merge: string) => {
        // Parse range A1:B2
        // We can use a helper or parse manually
        // Range definition in schema is { startRow, startCol, endRow, endCol }
        // We need to decode A1:B2
        const range = this.parseRange(merge);
        if (range) mergedCells.push(range);
    });

    return {
        id: worksheet.name,
        name: worksheet.name,
        rowCount: worksheet.rowCount || 100,
        colCount: worksheet.columnCount || 26,
        cells,
        mergedCells,
        styles,
        colWidths,
        rowHeights
    };
  }

  static async sheetDataToBlob(sheetData: SheetData): Promise<Blob> {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetData.name || 'Sheet1');

      // 1. Set Columns
      if (sheetData.colWidths) {
          Object.entries(sheetData.colWidths).forEach(([key, px]) => {
              const colIndex = parseInt(key) + 1;
              const width = px / 7.5; // Approx convert back
              const col = worksheet.getColumn(colIndex);
              col.width = width;
          });
      }

      // 2. Set Rows & Cells
      sheetData.cells.forEach((cell, key) => {
          const [r, c] = key.split(',').map(Number);
          const excelRow = r + 1;
          const excelCol = c + 1;
          
          const wCell = worksheet.getCell(excelRow, excelCol);
          
          // Value
          if (cell.f) {
              wCell.value = { formula: cell.f.startsWith('=') ? cell.f.substring(1) : cell.f };
          } else {
              wCell.value = cell.v as any;
          }

          // Style
          if (cell.s && sheetData.styles[cell.s]) {
              const s = sheetData.styles[cell.s];
              if (s.bold || s.italic || s.fontSize || s.fontFamily || s.color) {
                  wCell.font = {};
                  if (s.bold) wCell.font.bold = true;
                  if (s.italic) wCell.font.italic = true;
                  if (s.fontSize) wCell.font.size = s.fontSize;
                  if (s.fontFamily) wCell.font.name = s.fontFamily;
                  if (s.color) wCell.font.color = { argb: 'FF' + s.color.replace('#', '') };
              }
              if (s.backgroundColor) {
                  wCell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FF' + s.backgroundColor.replace('#', '') }
                  };
              }
              if (s.align || s.valign) {
                  wCell.alignment = {};
                  if (s.align) wCell.alignment.horizontal = s.align;
                  if (s.valign) wCell.alignment.vertical = s.valign;
              }
          }
      });

      // 3. Merges
      sheetData.mergedCells.forEach(range => {
          worksheet.mergeCells(
              range.startRow + 1,
              range.startCol + 1,
              range.endRow + 1,
              range.endCol + 1
          );
      });

      // 4. Row Heights
      if (sheetData.rowHeights) {
          Object.entries(sheetData.rowHeights).forEach(([key, height]) => {
              const r = parseInt(key) + 1;
              const row = worksheet.getRow(r);
              row.height = height;
          });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private static parseRange(rangeStr: string): Range | null {
      const parts = rangeStr.split(':');
      if (parts.length !== 2) return null;
      
      const start = this.decodeAddress(parts[0]);
      const end = this.decodeAddress(parts[1]);
      
      return {
          startRow: start.row,
          startCol: start.col,
          endRow: end.row,
          endCol: end.col
      };
  }

  private static decodeAddress(address: string): { row: number, col: number } {
      const colStr = address.match(/[A-Z]+/)?.[0] || 'A';
      const rowStr = address.match(/[0-9]+/)?.[0] || '1';
      
      let col = 0;
      for (let i = 0; i < colStr.length; i++) {
          col = col * 26 + (colStr.charCodeAt(i) - 64);
      }
      
      return {
          row: parseInt(rowStr) - 1,
          col: col - 1
      };
  }
}
