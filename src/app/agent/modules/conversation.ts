'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { withTransaction } from "@/lib/infra/db-transaction";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";

export async function getConversations() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  return CacheService.get(`agent:conversations:${userId}`, async () => {
    return prisma.agentConversation.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        tools: {
          include: {
            tool: true
          }
        }
      }
    });
  }, 300);
}

export async function createConversation(title: string = "New Conversation") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  const conversation = await prisma.agentConversation.create({
    data: {
      title,
      userId: userId,
    }
  });

  await CacheService.del(`agent:conversations:${userId}`);
  revalidatePath("/agent");
  return conversation;
}

export async function deleteConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  await withTransaction(async (tx) => {
    await tx.agentConversation.delete({
      where: { id, userId: userId }
    });
  });

  await CacheService.del(`agent:conversations:${userId}`);
  await CacheService.del(`agent:conversation:${id}`);
  revalidatePath("/agent");
}

export async function getConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  return CacheService.get(`agent:conversation:${id}`, async () => {
    return prisma.agentConversation.findFirst({
      where: { id, userId: userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        tools: {
          include: {
            tool: true
          }
        },
        files: {
          include: {
            file: true
          }
        }
      }
    });
  }, 60);
}
