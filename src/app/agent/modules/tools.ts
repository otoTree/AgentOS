'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { withTransaction } from "@/lib/infra/db-transaction";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";

export async function getPublicTools() {
    // Cache public tools for 5 minutes
    return await CacheService.get("marketplace:public_tools", async () => {
        // In a real scenario, we'd filter by "Public Deployments" and get the underlying tool
        // For now, we can query projects with public deployments
        const projects = await prisma.project.findMany({
            where: {
                deployments: {
                    some: {
                        isActive: true,
                        accessType: 'PUBLIC'
                    }
                }
            },
            include: {
                deployments: {
                    where: { isActive: true, accessType: 'PUBLIC' },
                    include: { tool: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        // Extract tools from active deployments
        const tools = projects.flatMap(p => p.deployments
            .filter(d => d.tool !== null)
            .map(d => ({
                ...d.tool!, // Force non-null assertion since we filtered
                projectName: p.name,
                projectAvatar: p.avatar,
                deploymentId: d.id
            }))
        );

        return tools;
    }, 300); // 300 seconds = 5 minutes
}

export async function getUserTools() {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    return await CacheService.get(`user:tools:${userId}`, async () => {
        // Find projects owned by the user that have active deployments
        // We include both public and private tools since they belong to the user
        const projects = await prisma.project.findMany({
            where: {
                userId: userId,
            },
            include: {
                deployments: {
                    where: { isActive: true },
                    include: { tool: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        // Extract tools from active deployments
        const tools = projects.flatMap(p => p.deployments
            .filter(d => d.tool !== null)
            .map(d => ({
                ...d.tool!,
                projectName: p.name,
                projectAvatar: p.avatar,
                deploymentId: d.id
            }))
        );

        return tools;
    }, 60); // Cache for 1 minute
}

export async function addToolToConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await withTransaction(async (tx) => {
    // Verify ownership of conversation
    const conversation = await tx.agentConversation.findUnique({
      where: { id: conversationId, userId: userId }
    });
    if (!conversation) throw new Error("Conversation not found");

    // Check if tool is already added
    const existing = await tx.conversationTool.findUnique({
      where: {
        conversationId_toolId: {
          conversationId,
          toolId
        }
      }
    });

    if (!existing) {
      await tx.conversationTool.create({
        data: {
          conversationId,
          toolId
        }
      });
    }
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeToolFromConversation(conversationId: string, toolId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await withTransaction(async (tx) => {
    await tx.conversationTool.delete({
      where: {
        conversationId_toolId: {
          conversationId,
          toolId
        }
      }
    });
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}
