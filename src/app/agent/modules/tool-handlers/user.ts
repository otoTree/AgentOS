import { prisma } from "@/lib/infra/prisma";
import { executeCode } from "@/lib/execution/sandbox";
import { wrapCode } from "@/lib/execution/code-wrapper";

export async function handleUserTool(call: any, conversation: any, userId: string) {
    const toolDef = conversation.tools.find((t: any) => t.tool.id === call.id || t.tool.name === call.name);
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
    
    // Execute
    const wrappedCode = wrapCode(tool.code, inputs);
    const result = await executeCode(wrappedCode, 50000, apiToken.token);
    
    return result.stdout || result.stderr || "(No output)";
}
