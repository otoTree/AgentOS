import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { prisma } from "@/lib/infra/prisma";

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

    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
    });

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
        
        const existingFolder = await prisma.folder.findFirst({
            where: {
                userId: user.id,
                parentId: targetParentId,
                name: targetName,
                NOT: {
                    id: params.id
                }
            }
        });

        if (existingFolder) {
            return NextResponse.json({ error: "A folder with this name already exists in the destination" }, { status: 409 });
        }
    }

    const updatedFolder = await prisma.folder.update({
      where: { id: params.id },
      data: updateData,
    });

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
    const folder = await prisma.folder.findUnique({
      where: { id: params.id },
    });

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Recursively delete (Cascade delete in Prisma schema handles children folders and files)
    // However, we should probably handle S3 file deletion if we were deleting physical files.
    // Since Prisma handles the database records, we need to be careful about orphaned S3 objects.
    // For now, we will rely on the database cascade. In a production app, 
    // we would need to fetch all descendant files and delete them from S3.
    
    await prisma.folder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}