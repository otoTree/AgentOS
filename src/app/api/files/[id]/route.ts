import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { fileRepository } from "@/lib/repositories/file-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, folderId } = body;

    const file = await fileRepository.findById(params.id);

    if (!file || file.userId !== user.id) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (folderId !== undefined) updateData.folderId = folderId; // Allow moving to root with null

    // Check for duplicate name in the destination
    if (name || folderId !== undefined) {
        const targetFolderId = folderId !== undefined ? folderId : file.folderId;
        const targetName = name || file.name;
        
        // Check against other files in the destination folder
        const filesInFolder = await fileRepository.findByFolder(user.id, targetFolderId);
        const existingFile = filesInFolder.find(f => f.name === targetName && f.id !== params.id);
        
        if (existingFile) {
             return NextResponse.json({ error: "A file with this name already exists in the destination" }, { status: 409 });
        }
    }

    const updatedFile = await fileRepository.update(params.id, updateData);

    return NextResponse.json(updatedFile);
  } catch (error: any) {
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}