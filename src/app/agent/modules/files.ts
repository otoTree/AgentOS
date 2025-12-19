'use server'

import { auth } from "@/auth";
import { chatRepository } from "@/lib/repositories/chat-repository";
import { fileRepository } from "@/lib/repositories/file-repository";
import { folderRepository } from "@/lib/repositories/folder-repository";
import { fileShareRepository } from "@/lib/repositories/file-share-repository";
import { CacheService } from "@/lib/infra/cache";
import { FileStorage } from "@/lib/storage/file-storage";
import { extractText } from "@/lib/storage/text-extractor";
import { revalidatePath } from "next/cache";

export async function uploadAgentFile(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  
  const file = formData.get("file") as File;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file) throw new Error("No file provided");

  // Prepare data
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const key = FileStorage.getFileKey(userId, id);
  const content = await extractText(buffer, file.type);
  const name = Buffer.from(file.name, "latin1").toString("utf8");

  // Upload to S3 (outside transaction)
  await FileStorage.uploadFile(key, buffer, file.type);

  // 1. Find or Create "Agent Chat Uploads" folder
  let folder = await folderRepository.findByNameAndParent(userId, "Agent Chat Uploads", null);

  if (!folder) {
      folder = await folderRepository.create({
          name: "Agent Chat Uploads",
          userId: userId,
          parentId: undefined // null -> undefined for repository
      });
  }

  // 2. Create File Record
  const fileRecord = await fileRepository.create({
      id, // Override ID generation to match S3 key if we wanted, but here we used randomUUID anyway
      name,
      size: file.size,
      mimeType: file.type,
      s3Key: key,
      content,
      userId: userId,
      folderId: folder.id,
  });

  // 3. Create Public Link
  const token = crypto.randomUUID();
  await fileShareRepository.create({
      fileId: fileRecord.id,
      isPublic: true,
      token,
  });

  // 4. Link to Conversation if provided
  if (conversationId) {
      // Verify ownership
      const conversation = await chatRepository.findById(conversationId);
      
      if (conversation && conversation.userId === userId) {
          await chatRepository.addFile(conversationId, fileRecord.id);
      }
  }

  if (conversationId) {
      await CacheService.del(`agent:conversation:${conversationId}`);
      revalidatePath(`/agent/${conversationId}`);
  }

  // 7. Return Info for Agent Context
  const relativeUrl = `/share/${token}`;
  
  return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: relativeUrl,
      token: token,
      contentSummary: content ? content.substring(0, 200) + "..." : null
  };
}

export async function addFileToConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const conversation = await chatRepository.findById(conversationId);
  if (!conversation || conversation.userId !== userId) throw new Error("Conversation not found");

  // Check if file exists and belongs to user
  const file = await fileRepository.findById(fileId);
  if (!file || file.userId !== userId) throw new Error("File not found");

  await chatRepository.addFile(conversationId, fileId);

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeFileFromConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const conversation = await chatRepository.findById(conversationId);
  if (!conversation || conversation.userId !== userId) throw new Error("Conversation not found");

  await chatRepository.removeFile(conversationId, fileId);

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}
