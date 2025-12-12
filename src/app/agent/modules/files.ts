'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { withTransaction } from "@/lib/infra/db-transaction";
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

  // DB Transaction
  const result = await withTransaction(async (tx) => {
      // 1. Find or Create "Agent Chat Uploads" folder
      let folder = await tx.folder.findFirst({
          where: {
              userId: userId,
              name: "Agent Chat Uploads",
              parentId: null
          }
      });

      if (!folder) {
          folder = await tx.folder.create({
              data: {
                  name: "Agent Chat Uploads",
                  userId: userId,
                  parentId: null
              }
          });
      }

      // 2. Create File Record
      const fileRecord = await tx.file.create({
        data: {
          id,
          name,
          size: file.size,
          mimeType: file.type,
          s3Key: key,
          content,
          userId: userId,
          folderId: folder.id,
        },
      });

      // 3. Create Public Link
      const token = crypto.randomUUID();
      await tx.fileShare.create({
          data: {
              fileId: fileRecord.id,
              isPublic: true,
              token,
          }
      });

      // 4. Link to Conversation if provided
      if (conversationId) {
          // Verify ownership
          const conversation = await tx.agentConversation.findUnique({
              where: { id: conversationId, userId: userId }
          });
          
          if (conversation) {
              await tx.conversationFile.create({
                  data: {
                      conversationId,
                      fileId: fileRecord.id
                  }
              });
          }
      }

      return { token, fileRecord };
  });

  if (conversationId) {
      await CacheService.del(`agent:conversation:${conversationId}`);
      revalidatePath(`/agent/${conversationId}`);
  }

  // 7. Return Info for Agent Context
  // We return the relative link so the client can construct the full URL
  const relativeUrl = `/share/${result.token}`;
  
  return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: relativeUrl,
      token: result.token,
      contentSummary: content ? content.substring(0, 200) + "..." : null
  };
}

export async function addFileToConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const conversation = await prisma.agentConversation.findUnique({
    where: { id: conversationId, userId: userId }
  });

  if (!conversation) throw new Error("Conversation not found");

  // Check if file exists and belongs to user
  const file = await prisma.file.findUnique({
    where: { id: fileId, userId: userId }
  });

  if (!file) throw new Error("File not found");

  // Check if already added
  const existing = await prisma.conversationFile.findUnique({
    where: {
      conversationId_fileId: {
        conversationId,
        fileId
      }
    }
  });

  if (!existing) {
    await prisma.conversationFile.create({
      data: {
        conversationId,
        fileId
      }
    });
  }

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}

export async function removeFileFromConversation(conversationId: string, fileId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  await prisma.conversationFile.deleteMany({
    where: {
      conversationId,
      fileId,
      conversation: {
        userId: userId
      }
    }
  });

  await CacheService.del(`agent:conversation:${conversationId}`);
  revalidatePath(`/agent/${conversationId}`);
}
