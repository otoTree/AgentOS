import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { fileRepository } from "@/lib/repositories/file-repository";
import { fileShareRepository } from "@/lib/repositories/file-share-repository";
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

  let files;
  if (search) {
      files = await fileRepository.search(user.id, search, folderId);
  } else {
      files = await fileRepository.findByFolder(user.id, folderId);
  }

  const response = files.map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    mimeType: f.mimeType,
    folderId: f.folderId,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  return NextResponse.json(response);
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

    const newFile = await fileRepository.create({
        id,
        name: Buffer.from(file.name, "latin1").toString("utf8"),
        size: file.size,
        mimeType: file.type,
        s3Key: key,
        content,
        userId: user.id,
        folderId: folderId || undefined,
    });

    let responseData: any = newFile;

    if (isPublic) {
      // Create public link
      const token = crypto.randomUUID();
      await fileShareRepository.create({
          fileId: newFile.id,
          isPublic: true,
          token,
          expiresAt: undefined // Optional
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
