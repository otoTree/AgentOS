"use server";

import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";
import { extractText } from "@/lib/storage/text-extractor";
import { revalidatePath } from "next/cache";
import { FolderWithCount, BreadcrumbItem } from "./types";

export async function uploadFile(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");
  const folderId = formData.get("folderId") as string | null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = crypto.randomUUID();
  const key = FileStorage.getFileKey(user.id, id);

  // Upload to S3
  await FileStorage.uploadFile(key, buffer, file.type);

  // Extract Text (async, but we await here for simplicity, could be a background job)
  const content = await extractText(buffer, file.type);

  // Save to DB
  // Use Buffer.from(file.name, 'latin1').toString('utf8') to fix potential encoding issues if needed,
  // but browsers usually send UTF-8. If there's an issue, it might be here.
  // Assuming standard behavior, we use file.name directly.
  // If issues persist, consider: Buffer.from(file.name, "latin1").toString("utf8")
  
  await prisma.file.create({
    data: {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      s3Key: key,
      content,
      userId: user.id,
      folderId: folderId || null,
    },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function createFile(name: string, folderId: string | null, content: string = "") {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    if (!name) throw new Error("Name is required");

    // Check for duplicate name in the folder
    const existingFile = await prisma.file.findFirst({
        where: {
            userId: user.id,
            folderId: folderId || null,
            name: name,
        }
    });

    if (existingFile) {
        throw new Error("A file with this name already exists in this folder");
    }

    // Determine mimeType
    const ext = name.split('.').pop()?.toLowerCase();
    let mimeType = "text/plain";
    if (ext === "json") mimeType = "application/json";
    else if (ext === "js") mimeType = "application/javascript";
    else if (ext === "ts") mimeType = "application/typescript";
    else if (ext === "html") mimeType = "text/html";
    else if (ext === "css") mimeType = "text/css";
    else if (ext === "md") mimeType = "text/markdown";
    else if (ext === "py") mimeType = "text/x-python";
    else if (ext === "xml") mimeType = "application/xml";
    else if (ext === "yaml" || ext === "yml") mimeType = "application/yaml";
    
    const buffer = Buffer.from(content);
    const id = crypto.randomUUID();
    const key = FileStorage.getFileKey(user.id, id);

    // Upload to S3
    await FileStorage.uploadFile(key, buffer, mimeType);

    // Save to DB
    const file = await prisma.file.create({
        data: {
            id,
            name,
            size: buffer.length,
            mimeType,
            s3Key: key,
            content, // Index content immediately
            userId: user.id,
            folderId: folderId || null,
        },
        include: { shares: true } // Include shares for consistency with FileWithShares type
    });

    revalidatePath("/dashboard/files");
    return file;
}
export async function updateFileContent(fileId: string, content: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.userId !== user.id) {
    throw new Error("File not found or unauthorized");
  }

  const buffer = Buffer.from(content);
  
  // Update S3
  await FileStorage.uploadFile(file.s3Key, buffer, file.mimeType);

  // Update DB
  await prisma.file.update({
    where: { id: fileId },
    data: {
      size: buffer.length,
      content: content, // Update indexed content
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/files");
  return { success: true };
}

export async function getFileContent(fileId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const file = await prisma.file.findUnique({
        where: { id: fileId },
    });

    if (!file || file.userId !== user.id) {
        throw new Error("File not found or unauthorized");
    }

    return file.content;
}

export async function getFiles(search?: string, folderId?: string | null) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const where: any = {
    userId: user.id,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  } else {
      // Only filter by folder if not searching (search is usually global)
      where.folderId = folderId || null;
  }

  const files = await prisma.file.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { shares: true },
  });

  return files;
}

export async function getFolders(parentId: string | null) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    const folders = await prisma.folder.findMany({
        where: {
            userId: user.id,
            parentId: parentId || null,
        },
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { files: true, children: true }
            }
        }
    });

    return folders as FolderWithCount[];
}

export async function createFolder(name: string, parentId: string | null) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    if (!name) throw new Error("Name is required");

    await prisma.folder.create({
        data: {
            name,
            parentId: parentId || null,
            userId: user.id,
        }
    });

    revalidatePath("/dashboard/files");
}

export async function renameFolder(folderId: string, newName: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.folder.update({
        where: { id: folderId, userId: user.id },
        data: { name: newName }
    });

    revalidatePath("/dashboard/files");
}

export async function deleteFolder(folderId: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    // Prisma cascade delete handles children
    await prisma.folder.delete({
        where: { id: folderId, userId: user.id }
    });

    revalidatePath("/dashboard/files");
}

export async function deleteFile(fileId: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.userId !== user.id) {
    throw new Error("File not found or unauthorized");
  }

  await FileStorage.deleteFile(file.s3Key);
  await prisma.file.delete({ where: { id: fileId } });

  revalidatePath("/dashboard/files");
}

export async function renameFile(fileId: string, newName: string) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.file.update({
        where: { id: fileId, userId: user.id },
        data: { name: newName }
    });

    revalidatePath("/dashboard/files");
}

export async function moveFile(fileId: string, folderId: string | null) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");

    await prisma.file.update({
        where: { id: fileId, userId: user.id },
        data: { folderId: folderId || null }
    });

    revalidatePath("/dashboard/files");
}

export async function moveFolder(folderId: string, targetParentId: string | null) {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Unauthorized");
    
    if (folderId === targetParentId) throw new Error("Cannot move folder into itself");

    await prisma.folder.update({
        where: { id: folderId, userId: user.id },
        data: { parentId: targetParentId || null }
    });

    revalidatePath("/dashboard/files");
}

export async function getBreadcrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
    if (!folderId) return [];
    
    const user = await getAuthenticatedUser();
    if (!user) return [];

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentId = folderId;

    // Prevent infinite loops with depth limit
    let depth = 0;
    while (currentId && depth < 10) {
        const folder = await prisma.folder.findUnique({
            where: { id: currentId },
            select: { id: true, name: true, parentId: true }
        });

        if (!folder) break;

        breadcrumbs.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId || "";
        depth++;
    }

    return breadcrumbs;
}

export async function getDownloadUrl(fileId: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) throw new Error("File not found");
  
  // Check access (Owner or Shared)
  let hasAccess = file.userId === user.id;
  
  if (!hasAccess) {
    const share = await prisma.fileShare.findFirst({
      where: {
        fileId,
        sharedWithUserId: user.id,
      },
    });
    if (share) hasAccess = true;
  }

  if (!hasAccess) throw new Error("Unauthorized");

  // Return Proxy URL instead of direct S3 URL
  return `/api/files/${fileId}/download`;
}

export async function shareFile(fileId: string, email?: string, isPublic: boolean = false) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file || file.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  if (isPublic) {
    // Create public link
    const token = crypto.randomUUID();
    await prisma.fileShare.create({
      data: {
        fileId,
        isPublic: true,
        token,
      },
    });
    return { token };
  } else if (email) {
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) throw new Error("User not found");

    await prisma.fileShare.create({
      data: {
        fileId,
        sharedWithUserId: targetUser.id,
      },
    });
    return { success: true };
  }
}