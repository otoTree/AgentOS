export function getToolDefinitions(conversation?: any, context?: { browserSessionId?: string }) {
    let toolPromptSection = "\n\n# AVAILABLE TOOLS\n\n";

    // 1. Built-in Tools
    toolPromptSection += `## search_tools (ID: builtin_search)\n`;
    toolPromptSection += `Description: Search for available tools in the marketplace. Use this when the user asks for a capability you don't currently have.\n`;
    toolPromptSection += `Inputs: [{"name": "query", "type": "string", "description": "Search keywords"}]\n\n`;

    toolPromptSection += `## enable_tools (ID: builtin_enable)\n`;
    toolPromptSection += `Description: Enable one or more tools by their IDs. Use this after finding relevant tools via search_tools.\n`;
    toolPromptSection += `Inputs: [{"name": "toolIds", "type": "string[]", "description": "List of Tool IDs to enable"}]\n\n`;

    toolPromptSection += `## open_window (ID: builtin_open_window)\n`;
    toolPromptSection += `Description: Open a special function window in the user's interface. Available types: 'files' (File Browser), 'workbench' (Project Workbench), 'editor' (Code Editor).\n`;
    toolPromptSection += `Inputs: [{"name": "window_type", "type": "string", "description": "Type of window: 'files', 'workbench', 'editor'"}, {"name": "file_id", "type": "string", "description": "Optional: File ID if opening editor"}]\n\n`;


    // 1.5 File System Tools
    toolPromptSection += `## fs_list_files (ID: fs_list_files)\n`;
    toolPromptSection += `Description: List files and folders in a specific directory. Use folderId=null for root.\n`;
    toolPromptSection += `Inputs: [{"name": "folderId", "type": "string | null", "description": "Folder ID to list content for. Omit or null for root."}]\n\n`;

    toolPromptSection += `## fs_read_file (ID: fs_read_file)\n`;
    toolPromptSection += `Description: Read the content of a file by its ID.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "The ID of the file to read"}]\n\n`;

    toolPromptSection += `## fs_create_file (ID: fs_create_file)\n`;
    toolPromptSection += `Description: Create a new file in a specific folder.\n`;
    toolPromptSection += `Inputs: [{"name": "name", "type": "string", "description": "File name with extension"}, {"name": "folderId", "type": "string | null", "description": "Parent folder ID"}, {"name": "content", "type": "string", "description": "Initial file content"}]\n\n`;

    toolPromptSection += `## fs_update_file (ID: fs_update_file)\n`;
    toolPromptSection += `Description: Update the content of an existing file.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "File ID"}, {"name": "content", "type": "string", "description": "New file content (overwrites existing)"}]\n\n`;

    toolPromptSection += `## fs_delete_file (ID: fs_delete_file)\n`;
    toolPromptSection += `Description: Delete a file by its ID.\n`;
    toolPromptSection += `Inputs: [{"name": "fileId", "type": "string", "description": "File ID"}]\n\n`;

    // 1.6 Excel Tools
    toolPromptSection += `## excel_list_workbooks (ID: excel_list_workbooks)\n`;
    toolPromptSection += `Description: List all available Excel workbooks.\n`;
    toolPromptSection += `Inputs: []\n\n`;

    toolPromptSection += `## excel_create_workbook (ID: excel_create_workbook)\n`;
    toolPromptSection += `Description: Create a new empty workbook.\n`;
    toolPromptSection += `Inputs: [{"name": "name", "type": "string", "description": "Optional name for the workbook"}]\n\n`;

    toolPromptSection += `## excel_delete_workbook (ID: excel_delete_workbook)\n`;
    toolPromptSection += `Description: Delete a workbook by ID.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook to delete"}]\n\n`;

    toolPromptSection += `## excel_rename_workbook (ID: excel_rename_workbook)\n`;
    toolPromptSection += `Description: Rename a workbook.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "newName", "type": "string", "description": "New name for the workbook"}]\n\n`;

    toolPromptSection += `## excel_get_workbook (ID: excel_get_workbook)\n`;
    toolPromptSection += `Description: Get details of a workbook (sheets, metadata).\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}]\n\n`;

    toolPromptSection += `## excel_add_sheet (ID: excel_add_sheet)\n`;
    toolPromptSection += `Description: Add a new sheet to a workbook.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "name", "type": "string", "description": "Optional name for the sheet"}]\n\n`;

    toolPromptSection += `## excel_delete_sheet (ID: excel_delete_sheet)\n`;
    toolPromptSection += `Description: Delete a sheet from a workbook.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "sheetId", "type": "string", "description": "ID of the sheet to delete"}]\n\n`;

    toolPromptSection += `## excel_rename_sheet (ID: excel_rename_sheet)\n`;
    toolPromptSection += `Description: Rename a sheet.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "sheetId", "type": "string", "description": "ID of the sheet"}, {"name": "newName", "type": "string", "description": "New name for the sheet"}]\n\n`;

    toolPromptSection += `## excel_set_cell_value (ID: excel_set_cell_value)\n`;
    toolPromptSection += `Description: Set a cell value. Row and Col are 0-based indices.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "sheetId", "type": "string", "description": "ID of the sheet"}, {"name": "row", "type": "number", "description": "Row index (0-based)"}, {"name": "col", "type": "number", "description": "Column index (0-based)"}, {"name": "value", "type": "string|number", "description": "Value to set"}]\n\n`;

    toolPromptSection += `## excel_batch_set_cell_values (ID: excel_batch_set_cell_values)\n`;
    toolPromptSection += `Description: Set multiple cell values at once. Row and Col are 0-based indices.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "sheetId", "type": "string", "description": "ID of the sheet"}, {"name": "updates", "type": "Array<{row: number, col: number, value: string|number}>", "description": "List of updates"}]\n\n`;

    toolPromptSection += `## excel_get_cell_value (ID: excel_get_cell_value)\n`;
    toolPromptSection += `Description: Get a cell value. Row and Col are 0-based indices.\n`;
    toolPromptSection += `Inputs: [{"name": "workbookId", "type": "string", "description": "ID of the workbook"}, {"name": "sheetId", "type": "string", "description": "ID of the sheet"}, {"name": "row", "type": "number", "description": "Row index (0-based)"}, {"name": "col", "type": "number", "description": "Column index (0-based)"}]\n\n`;


    // 1.7 Data Source Tools
    toolPromptSection += `## datasource_list (ID: datasource_list)\n`;
    toolPromptSection += `Description: List all available data sources configured by the user.\n`;
    toolPromptSection += `Inputs: []\n\n`;

    toolPromptSection += `## datasource_query (ID: datasource_query)\n`;
    toolPromptSection += `Description: Execute a natural language query against a specific data source. Returns the query result.\n`;
    toolPromptSection += `Inputs: [{"name": "dataSourceId", "type": "string", "description": "ID of the data source to query"}, {"name": "query", "type": "string", "description": "Natural language query (e.g., 'Show me top 10 users by age')"}]\n\n`;

    toolPromptSection += `## datasource_schema (ID: datasource_schema)\n`;
    toolPromptSection += `Description: Get the schema (tables and columns) of a data source.\n`;
    toolPromptSection += `Inputs: [{"name": "dataSourceId", "type": "string", "description": "ID of the data source"}]\n\n`;


    toolPromptSection += `## browser_open (ID: browser_open)\n`;
    toolPromptSection += `Description: Open a URL in the browser. Returns the session ID.\n`;
    toolPromptSection += `Inputs: [{"name": "url", "type": "string", "description": "URL to open"}]\n\n`;

    toolPromptSection += `## browser_navigate (ID: browser_navigate)\n`;
    toolPromptSection += `Description: Navigate to a URL in an existing browser session.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "url", "type": "string", "description": "URL to navigate to"}]\n\n`;

    toolPromptSection += `## browser_click (ID: browser_click)\n`;
    toolPromptSection += `Description: Click on an element in the browser using a CSS selector.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "selector", "type": "string", "description": "CSS selector of the element to click"}]\n\n`;

    toolPromptSection += `## browser_type (ID: browser_type)\n`;
    toolPromptSection += `Description: Type text into the browser.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "text", "type": "string", "description": "Text to type"}]\n\n`;

    toolPromptSection += `## browser_scroll (ID: browser_scroll)\n`;
    toolPromptSection += `Description: Scroll the browser page.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}, {"name": "direction", "type": "string", "description": "up/down"}, {"name": "amount", "type": "number", "description": "pixels"}]\n\n`;

    toolPromptSection += `## browser_screenshot (ID: browser_screenshot)\n`;
    toolPromptSection += `Description: Get a screenshot of the current page.\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}]\n\n`;

    toolPromptSection += `## browser_source (ID: browser_source)\n`;
    toolPromptSection += `Description: Get the HTML source of the current page (filtered JS/CSS).\n`;
    toolPromptSection += `Inputs: [{"name": "sessionId", "type": "string", "description": "Browser Session ID"}]\n\n`;

    // 1.8 Workbench Tools
    toolPromptSection += `## workbench_list_projects (ID: workbench_list_projects)\n`;
    toolPromptSection += `Description: List all workbench projects.\n`;
    toolPromptSection += `Inputs: []\n\n`;

    toolPromptSection += `## workbench_create_project (ID: workbench_create_project)\n`;
    toolPromptSection += `Description: Create a new workbench project. This will also create a default main tool.\n`;
    toolPromptSection += `Inputs: [{"name": "name", "type": "string", "description": "Project name"}, {"name": "description", "type": "string", "description": "Optional project description"}]\n\n`;

    toolPromptSection += `## workbench_get_project (ID: workbench_get_project)\n`;
    toolPromptSection += `Description: Get details of a project, including its tools and their code.\n`;
    toolPromptSection += `Inputs: [{"name": "id", "type": "string", "description": "Project ID"}]\n\n`;

    toolPromptSection += `## workbench_create_tool (ID: workbench_create_tool)\n`;
    toolPromptSection += `Description: Create a new tool (serverless function) in a project.\n`;
    toolPromptSection += `Inputs: [{"name": "projectId", "type": "string", "description": "Project ID"}, {"name": "name", "type": "string", "description": "Tool name"}, {"name": "description", "type": "string", "description": "Optional tool description"}]\n\n`;

    toolPromptSection += `## workbench_update_tool_code (ID: workbench_update_tool_code)\n`;
    toolPromptSection += `Description: Update the code of a tool.\n`;
    toolPromptSection += `Inputs: [{"name": "toolId", "type": "string", "description": "Tool ID"}, {"name": "code", "type": "string", "description": "New Python code"}]\n\n`;

    toolPromptSection += `## workbench_delete_project (ID: workbench_delete_project)\n`;
    toolPromptSection += `Description: Delete a project.\n`;
    toolPromptSection += `Inputs: [{"name": "id", "type": "string", "description": "Project ID"}]\n\n`;

    if (context?.browserSessionId) {
        toolPromptSection += `\n# ACTIVE BROWSER SESSION\n`;
        toolPromptSection += `There is an active browser session available from the user's "Manage Context" view.\n`;
        toolPromptSection += `Session ID: ${context.browserSessionId}\n`;
        toolPromptSection += `You can use this Session ID with browser tools (navigate, click, type, etc.) to control the user's browser view.\n\n`;
    }

    // 2. User Enabled Tools
    if (conversation?.tools) {
        conversation.tools.forEach((t: any) => {
            toolPromptSection += `## ${t.tool.name} (ID: ${t.tool.id})\n`;
            toolPromptSection += `Description: ${t.tool.description || 'No description'}\n`;
            toolPromptSection += `Inputs: ${JSON.stringify(t.tool.inputs)}\n\n`;
        });
    }

    return toolPromptSection;
}

export function generateSystemPrompt(conversation: any, context?: { browserSessionId?: string }) {
    // 4. Prepare Tools
    // We inject tool descriptions into the system prompt as requested.
    // Format:
    // Tool Name: [name]
    // Description: [desc]
    // Inputs: [json inputs]
    
    const toolPromptSection = getToolDefinitions(conversation, context);

    // 5. Prepare Files Context
    // We inject a list of available files
    let filePromptSection = "\n\n# ATTACHED FILES\n\n";
    if (conversation.files.length > 0) {
        filePromptSection += "You have access to the following files:\n";
        conversation.files.forEach((f: any) => {
            filePromptSection += `- [File: ${f.file.name}] (ID: ${f.file.id}, Type: ${f.file.mimeType})\n`;
            // If text file, maybe include snippet? For now, keep it simple.
        });
        filePromptSection += "\nUse 'fs_read_file' to read their content if needed.\n";
    } else {
        filePromptSection += "No files attached currently.\n";
    }

    const systemPrompt = `You are a helpful AI agent capable of using tools and managing files.
    
${toolPromptSection}
${filePromptSection}

To call a tool, you MUST output a JSON object in the following format ONLY (no other text):
{
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": {
        "arg1": "value1"
      },
      "id": "tool_id"
    }
  ]
}

If you don't need to call a tool, just reply with your text response.
`;

    return systemPrompt;
}

export function prepareMessages(dbMessages: any[], systemPrompt: string) {
    return [
        { role: 'system', content: systemPrompt },
        ...dbMessages.map(m => {
            try {
                // Fix for legacy/inconsistent message formats to prevent model confusion
                if (m.content.trim().startsWith('{')) {
                    const obj = JSON.parse(m.content);
                    
                    // Convert legacy "type: tool_call" to standard "tool_calls" format
                    if (obj.type === 'tool_call') {
                        return {
                            role: 'assistant',
                            content: JSON.stringify({
                                tool_calls: [{
                                    name: obj.tool,
                                    arguments: obj.args,
                                    id: "call_" + Math.random().toString(36).substr(2, 9)
                                }]
                            })
                        };
                    }
                    
                    // Convert legacy "type: tool_result" to User message format
                    if (obj.type === 'tool_result') {
                        return {
                            role: 'user',
                            content: `Tool Execution Results:\nTool '${obj.tool}' Output:\n${obj.output}\n\n`
                        };
                    }
                }
            } catch (e) {
                // Ignore parse errors, treat as text
            }
            return { role: m.role, content: m.content };
        })
    ];
}
