import { toolSearch } from "@/lib/ai/tool-search";
import { addToolToConversation } from "../tools";
import { fileRepository } from "@/lib/repositories/file-repository";

export async function handleBuiltinTool(call: any, conversationId: string) {
    if (call.id === 'builtin_search' || call.name === 'search_tools') {
        const query = (call.arguments?.query || '').toLowerCase();
        // const terms = query.split(/\s+/).filter((t: string) => t.length > 0);
        return await toolSearch(query);
    }

    if (call.id === 'builtin_enable' || call.name === 'enable_tools') {
        const toolIds = call.arguments?.toolIds || [];
        if (Array.isArray(toolIds)) {
            let addedCount = 0;
            for (const tid of toolIds) {
                try {
                    await addToolToConversation(conversationId, tid);
                    addedCount++;
                } catch (e) {
                    console.error(`Failed to add tool ${tid}`, e);
                }
            }
            return `Enabled ${addedCount} tools.`;
        } else {
            return "Invalid arguments. toolIds must be an array of strings.";
        }
    }

    if (call.name === 'open_window') {
        const { window_type, file_id } = call.arguments;
        let resultOutput = `Window '${window_type}' command sent to client.`;
        if (file_id) {
            try {
                const file = await fileRepository.findById(file_id);
                if (file) {
                    resultOutput += ` File: ${file.name}`;
                }
            } catch (e) { /* ignore */ }
        }
        return resultOutput;
    }

    return null;
}
