import { handleBuiltinTool } from "./builtin";
import { handleFileSystemTool } from "./filesystem";
import { handleBrowserTool } from "./browser";
import { handleExcelTool } from "./excel";
import { handleUserTool } from "./user";
import { handleDataSourceTool } from "./datasource";
import { handleWorkbenchTool } from "./workbench";
import { handleEmailTool } from "./email";

export interface ToolResult {
    output: string | null;
    browserState?: {
        sessionId?: string;
        url?: string;
        screenshot?: string;
    };
}

export async function executeTool(call: any, context: {
    conversationId: string;
    userId: string;
    conversation: any;
}): Promise<ToolResult> {
    // 1. Built-in Tools
    if (['builtin_search', 'search_tools', 'builtin_enable', 'enable_tools', 'open_window'].includes(call.name) || 
        ['builtin_search', 'builtin_enable', 'builtin_open_window'].includes(call.id)) {
        return { output: await handleBuiltinTool(call, context.conversationId) };
    }

    // 2. File System Tools
    if (call.name.startsWith('fs_')) {
        return { output: await handleFileSystemTool(call, context.userId) };
    }

    // 3. Browser Tools
    if (call.name.startsWith('browser_')) {
        const result = await handleBrowserTool(call);
        if (result) return result;
    }

    // 4. Excel Tools
    if (call.name.startsWith('excel_')) {
        const result = await handleExcelTool(call);
        if (result) return { output: result };
    }

    // 5. Data Source Tools
    if (call.name.startsWith('datasource_')) {
        const result = await handleDataSourceTool(call, context.userId);
        if (result) return { output: result };
    }

    // 6. Workbench Tools
    if (call.name.startsWith('workbench_')) {
        const result = await handleWorkbenchTool(call, context.userId);
        return { output: result };
    }

    // 7. Email Tools
    if (call.name.startsWith('email_')) {
        const result = await handleEmailTool(call, context.userId);
        if (result) return { output: result };
    }

    // 8. User Tools
    const userToolResult = await handleUserTool(call, context.conversation, context.userId);
    if (userToolResult !== null) {
        return { output: userToolResult };
    }

    return { output: "Tool not found or not enabled." };
}

