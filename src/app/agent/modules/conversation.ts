'use server'

import { auth } from "@/auth";
import { chatRepository } from "@/lib/repositories/chat-repository";
import { CacheService } from "@/lib/infra/cache";
import { revalidatePath } from "next/cache";

export async function getConversations() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  return CacheService.get(`agent:conversations:${userId}`, async () => {
    // Basic fetch for list, might need tools if UI shows icons
    // For now, let's just fetch conversations. If we need tools, we'd need a richer fetch.
    // The original code included tools.
    const conversations = await chatRepository.findByUserId(userId);
    
    // If we really need tools for the list view, we have to fetch them.
    // This is N+1, but with Redis pipelining in findByUserId it's okay-ish, 
    // but here we are iterating. 
    // Optimization: create a specialized method in repository if performance is bad.
    
    const detailedConversations = await Promise.all(conversations.map(async (conv) => {
        const toolIds = await chatRepository.getTools(conv.id);
        // We probably don't need full tool details for the list, just existence or maybe names?
        // Let's mimic original structure: tools: { tool: true }
        // For simplicity/speed, we might skip this if the UI doesn't strictly need it, 
        // but to be safe, let's fetch.
        // Actually, let's defer detailed fetching to the individual view unless confirmed needed.
        // Original code: include tools.
        
        return {
            ...conv,
            tools: toolIds.map(id => ({ tool: { id } })) // Mock structure or fetch real
        };
    }));

    return detailedConversations;
  }, 300);
}

export async function createConversation(title: string = "New Conversation") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  const conversation = await chatRepository.create({
    title,
    userId: userId,
  });

  await CacheService.del(`agent:conversations:${userId}`);
  revalidatePath("/agent");
  return conversation;
}

export async function deleteConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const userId = session.user.id;

  // Verify ownership
  const conversation = await chatRepository.findById(id);
  if (conversation && conversation.userId === userId) {
      await chatRepository.delete(id);
  }

  await CacheService.del(`agent:conversations:${userId}`);
  await CacheService.del(`agent:conversation:${id}`);
  revalidatePath("/agent");
}

export async function getConversation(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = session.user.id;

  return CacheService.get(`agent:conversation:${id}`, async () => {
    const conversation = await chatRepository.findWithDetails(id);
    if (conversation && conversation.userId === userId) {
        return conversation;
    }
    return null;
  }, 60);
}
