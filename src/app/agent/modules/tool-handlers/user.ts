import { userRepository } from "@/lib/repositories/auth-repository";
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";
import { systemConfig } from "@/lib/infra/config";
import { v4 as uuidv4 } from 'uuid';

export async function handleUserTool(call: any, conversation: any, userId: string) {
    const normalize = (s: string) => s.toLowerCase().replace(/[\s_]+/g, '');
    
    const toolDef = conversation.tools.find((t: any) => {
        // 1. Exact ID match
        if (t.tool.id === call.id) return true;
        
        // 2. Exact Name match
        if (t.tool.name === call.name) return true;

        if (!call.name) return false;

        // 3. Normalized Name match (ignore case, spaces, underscores)
        const callNameNorm = normalize(call.name);
        const toolNameNorm = normalize(t.tool.name);
        
        return callNameNorm === toolNameNorm;
    });

    if (!toolDef) {
        return null; // Not a user tool or not found
    }

    // Check credits
    const user = await userRepository.findById(userId);

    if (!user || user.credits <= 0) {
        return "Error: Insufficient credits.";
    } 

    await userRepository.update(userId, { credits: user.credits - 1 });
    
    // Get or create API Token for the user to inject into the tool
    // TODO: Implement ApiTokenRepository. For now, we mock or skip.
    // If tools RELY on this token to call back into the API, we need it.
    // Let's assume for now tools are self-contained or we use a temporary placeholder.
    
    const apiToken = "sk-placeholder-" + userId; // Mock token since ApiToken migration is pending/skipped
    
    // Fetch tool code
    const tool = toolDef.tool;
    
    // Prepare inputs
    const inputs = call.arguments || {};
    
    // Inject system parameters
    //const appUrl = systemConfig.app.url || 'http://localhost:3000';
    //const fileUploadUrl = `${appUrl.replace(/\/$/, '')}/api/upload`;

    // Merge system params with user inputs
    // We do NOT overwrite user inputs if they happen to provide these (though unlikely)
    const finalInputs = {
        ...inputs
    };
    
    // Execute
    const wrappedCode = wrapCode(tool.code, finalInputs);
    const result = await executeCode(wrappedCode, 50000, apiToken);
    
    return result.stdout || result.stderr || "(No output)";
}
