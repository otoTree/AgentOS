import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { folderRepository } from "@/lib/repositories/folder-repository";

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
    const { name, parentId } = body;

    const folder = await folderRepository.findById(params.id);

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId; // Allow moving to root with null

    // Check for duplicates if renaming or moving
    if (name || parentId !== undefined) {
        const targetParentId = parentId !== undefined ? parentId : folder.parentId;
        const targetName = name || folder.name;
        
        // Use findByNameAndParent to check existence
        const existingFolder = await folderRepository.findByNameAndParent(user.id, targetName, targetParentId || null);

        if (existingFolder && existingFolder.id !== params.id) {
            return NextResponse.json({ error: "A folder with this name already exists in the destination" }, { status: 409 });
        }
    }

    const updatedFolder = await folderRepository.update(params.id, updateData);

    return NextResponse.json(updatedFolder);
  } catch (error: any) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const folder = await folderRepository.findById(params.id);

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // TODO: Handle recursive deletion properly in Redis (children folders and files)
    // Currently, this only deletes the folder record itself.
    // Orphaned children will remain but be invisible if client relies on parent traversal.
    // For a robust implementation, we need a recursive delete function in FolderRepository.
    
    await folderRepository.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
