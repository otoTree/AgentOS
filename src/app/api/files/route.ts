import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";
import { extractText } from "@/lib/storage/text-extractor";
import { StorageHelper } from "@/lib/storage/storage-helper";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  const folderId = searchParams.get("folderId");

  const where: any = {
    userId: user.id,
  };

  if (folderId !== undefined) { // Allow filtering by null (root) if explicit null/empty string logic needed
      where.folderId = folderId || null;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const files = await prisma.file.findMany({
    where,
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  return NextResponse.json(files);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const isPublic = searchParams.get("public") === "true";
    const folderId = searchParams.get("folderId");

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check storage limit
    const hasSpace = await StorageHelper.hasStorageSpace(user.id, file.size);
    if (!hasSpace) {
      return NextResponse.json({ error: "Storage limit exceeded. Please upgrade your plan." }, { status: 403 });
    }
    
    // 50MB single file limit (increased from implicit 5MB in profile or arbitrary limit)
    if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: "File size limit is 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = crypto.randomUUID();
    const key = FileStorage.getFileKey(user.id, id);

    await FileStorage.uploadFile(key, buffer, file.type);
    const content = await extractText(buffer, file.type);

    const newFile = await prisma.file.create({
      data: {
        id,
        name: Buffer.from(file.name, "latin1").toString("utf8"),
        size: file.size,
        mimeType: file.type,
        s3Key: key,
        content,
        userId: user.id,
        folderId: folderId || null,
      },
    });

    let responseData: any = newFile;

    if (isPublic) {
      // Create public link
      const token = crypto.randomUUID();
      await prisma.fileShare.create({
        data: {
          fileId: newFile.id,
          isPublic: true,
          token,
        },
      });

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      responseData = {
        ...newFile,
        shareToken: token,
        downloadUrl: `${baseUrl}/api/share/${token}/download`,
        shareUrl: `${baseUrl}/share/${token}`,
      };
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}