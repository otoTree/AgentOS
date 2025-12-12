import { 
  listWorkbooks, 
  loadWorkbook, 
  saveWorkbookToOss, 
  deleteWorkbookFromOss 
} from "@/app/excel-actions";
import { Workbook, Sheet } from "@/components/konva-table/types";

export async function handleExcelTool(call: any) {
  const args = call.arguments;

  // --- Workbook Operations ---

  if (call.name === 'excel_list_workbooks') {
    const res = await listWorkbooks();
    if (res.error) return `Error listing workbooks: ${res.error}`;
    return JSON.stringify(res.workbooks, null, 2);
  }

  if (call.name === 'excel_create_workbook') {
    const { name } = args;
    const id = crypto.randomUUID();
    const newWorkbook: Workbook = {
      id,
      name: name || "Untitled Workbook",
      sheets: [
        {
          id: "sheet1",
          name: "Sheet1",
          data: [] 
        }
      ],
      activeSheetId: "sheet1",
      lastModified: Date.now(),
      isDirty: false
    };
    
    const res = await saveWorkbookToOss(newWorkbook);
    if (res.error) return `Error creating workbook: ${res.error}`;
    return `Workbook created. ID: ${id}`;
  }

  if (call.name === 'excel_delete_workbook') {
    const { workbookId } = args;
    const res = await deleteWorkbookFromOss(workbookId);
    if (res.error) return `Error deleting workbook: ${res.error}`;
    return `Workbook ${workbookId} deleted.`;
  }

  if (call.name === 'excel_rename_workbook') {
    const { workbookId, newName } = args;
    const loadRes = await loadWorkbook(workbookId);
    if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;
    
    const wb = loadRes.workbook!;
    wb.name = newName;
    
    const saveRes = await saveWorkbookToOss(wb);
    if (saveRes.error) return `Error saving workbook: ${saveRes.error}`;
    return `Workbook renamed to ${newName}.`;
  }

  if (call.name === 'excel_get_workbook') {
    const { workbookId } = args;
    const res = await loadWorkbook(workbookId);
    if (res.error) return `Error loading workbook: ${res.error}`;
    // Return summary to avoid huge output
    const wb = res.workbook!;
    const summary = {
      id: wb.id,
      name: wb.name,
      sheets: wb.sheets.map(s => ({ id: s.id, name: s.name, rowCount: s.data?.length || 0 }))
    };
    return JSON.stringify(summary, null, 2);
  }

  // --- Sheet Operations ---

  if (call.name === 'excel_add_sheet') {
    const { workbookId, name } = args;
    const loadRes = await loadWorkbook(workbookId);
    if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;
    
    const wb = loadRes.workbook!;
    const newSheetId = crypto.randomUUID();
    const newSheet: Sheet = {
      id: newSheetId,
      name: name || `Sheet${wb.sheets.length + 1}`,
      data: []
    };
    
    wb.sheets.push(newSheet);
    wb.activeSheetId = newSheetId;
    
    const saveRes = await saveWorkbookToOss(wb);
    if (saveRes.error) return `Error saving workbook: ${saveRes.error}`;
    return `Sheet added. ID: ${newSheetId}`;
  }

  if (call.name === 'excel_delete_sheet') {
    const { workbookId, sheetId } = args;
    const loadRes = await loadWorkbook(workbookId);
    if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;
    
    const wb = loadRes.workbook!;
    const originalLength = wb.sheets.length;
    wb.sheets = wb.sheets.filter(s => s.id !== sheetId);
    
    if (wb.sheets.length === originalLength) return `Sheet ${sheetId} not found.`;
    
    // Ensure active sheet is valid
    if (wb.activeSheetId === sheetId) {
      wb.activeSheetId = wb.sheets.length > 0 ? wb.sheets[0].id : null;
    }
    
    const saveRes = await saveWorkbookToOss(wb);
    if (saveRes.error) return `Error saving workbook: ${saveRes.error}`;
    return `Sheet ${sheetId} deleted.`;
  }

  if (call.name === 'excel_rename_sheet') {
     const { workbookId, sheetId, newName } = args;
     const loadRes = await loadWorkbook(workbookId);
     if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;

     const wb = loadRes.workbook!;
     const sheet = wb.sheets.find(s => s.id === sheetId);
     if (!sheet) return `Sheet ${sheetId} not found.`;
     
     sheet.name = newName;
     
     const saveRes = await saveWorkbookToOss(wb);
     if (saveRes.error) return `Error saving workbook: ${saveRes.error}`;
     return `Sheet renamed to ${newName}.`;
  }

  // --- Cell Operations ---

  if (call.name === 'excel_set_cell_value') {
    const { workbookId, sheetId, row, col, value } = args;
    const loadRes = await loadWorkbook(workbookId);
    if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;
    
    const wb = loadRes.workbook!;
    const sheet = wb.sheets.find(s => s.id === sheetId);
    if (!sheet) return `Sheet ${sheetId} not found.`;
    
    // Ensure grid size
    // row and col are 0-based
    if (!sheet.data) sheet.data = [];
    
    // Expand rows if needed
    if (sheet.data.length <= row) {
        for (let i = sheet.data.length; i <= row; i++) {
            if (!sheet.data[i]) sheet.data[i] = [];
        }
    }
    
    if (!sheet.data[row]) sheet.data[row] = [];
    sheet.data[row][col] = value;
    
    const saveRes = await saveWorkbookToOss(wb);
    if (saveRes.error) return `Error saving workbook: ${saveRes.error}`;
    return `Cell (${row}, ${col}) set to ${value}.`;
  }

  if (call.name === 'excel_get_cell_value') {
    const { workbookId, sheetId, row, col } = args;
    const loadRes = await loadWorkbook(workbookId);
    if (loadRes.error) return `Error loading workbook: ${loadRes.error}`;
    
    const wb = loadRes.workbook!;
    const sheet = wb.sheets.find(s => s.id === sheetId);
    if (!sheet) return `Sheet ${sheetId} not found.`;
    
    const val = sheet.data?.[row]?.[col];
    return val === undefined || val === null ? "" : String(val);
  }

  return null;
}
