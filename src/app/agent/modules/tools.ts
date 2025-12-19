'use server'

import { auth } from "@/auth";
import { chatRepository } from "@/lib/repositories/chat-repository";
import { projectRepository, deploymentRepository } from "@/lib/repositories/project-repository";
import { toolRepository } from "@/lib/repositories/tool-repository";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";

export async function getPublicTools() {
    // Cache public tools for 5 minutes
    return await CacheService.get("marketplace:public_tools", async () => {
        // Fetch active public deployments from Redis
        // Note: DeploymentRepository doesn't expose a direct "findPublicDeployments" yet, 
        // but we indexed them in `marketplace:deployments:public`.
        
        // We need to implement a specialized fetch or use direct redis access in repository 
        // to get that ZSET. For now, let's assume we implement it or iterate manually (inefficient).
        
        // Let's rely on the fact that we might not have many public tools yet.
        // Or better, let's just return empty array until we add `findPublic` to DeploymentRepository.
        
        // TODO: Add `findPublic` to DeploymentRepository
        return [];
    }, 300);
}

export async function getUserTools() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    return await CacheService.get(`user:tools:${userId}`, async () => {
        const projects = await projectRepository.findByUserId(userId);
        
        // Fetch tools for each project
        const toolsPromises = projects.map(async (p) => {
            const projectTools = await toolRepository.findByProjectId(p.id);
            return projectTools.map(t => ({
                ...t,
                projectName: p.name,
                projectAvatar: p.avatar,
                // deploymentId: ... (We need to find active deployment for tool)
                // Simplification: Just return tool info
            }));
        });
        
        const tools = (await Promise.all(toolsPromises)).flat();
        return tools;
    }, 60);
}

export async function addToolToConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Verify ownership of conversation
  const conversation = await chatRepository.findById(conversationId);
  if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found or access denied");
  }

  await chatRepository.addTool(conversationId, toolId);

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeToolFromConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

   // Verify ownership of conversation
   const conversation = await chatRepository.findById(conversationId);
   if (!conversation || conversation.userId !== userId) {
       throw new Error("Conversation not found or access denied");
   }

  await chatRepository.removeTool(conversationId, toolId);

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}
