import { prisma } from "@/lib/infra/prisma";
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";
import { systemConfig } from "@/lib/infra/config";

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
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true }
    });

    if (!user || user.credits <= 0) {
        return "Error: Insufficient credits.";
    } 

    await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } }
    });
    
    // Get or create API Token for the user to inject into the tool
    let apiToken = await prisma.apiToken.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }
    });

    if (!apiToken) {
        // Auto-generate a token for agent usage
        const token = "sk-" + crypto.randomUUID();
        apiToken = await prisma.apiToken.create({
            data: {
                name: "Agent Auto-Token",
                userId: userId,
                token: token
            }
        });
    }

    // Fetch tool code
    const tool = toolDef.tool;
    
    // Prepare inputs
    const inputs = call.arguments || {};
    
    // Inject system parameters
    const appUrl = systemConfig.app.url || 'http://localhost:3000';
    const fileUploadUrl = `${appUrl.replace(/\/$/, '')}/api/upload`;

    // Merge system params with user inputs
    // We do NOT overwrite user inputs if they happen to provide these (though unlikely)
    const finalInputs = {
        api_token: apiToken.token,
        file_upload_url: fileUploadUrl,
        ...inputs
    };
    
    // Execute
    const wrappedCode = wrapCode(tool.code, finalInputs);
    const result = await executeCode(wrappedCode, 50000, apiToken.token);
    
    return result.stdout || result.stderr || "(No output)";
}
