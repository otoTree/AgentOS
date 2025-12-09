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
    const { name, folderId } = body;

    const file = await prisma.file.findUnique({
      where: { id: params.id },
    });

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
        
        // Check against other files
        const existingFile = await prisma.file.findFirst({
            where: {
                userId: user.id,
                folderId: targetFolderId,
                name: targetName,
                NOT: {
                    id: params.id
                }
            }
        });
        
        // Ideally we should also check if a folder has the same name, but file systems usually allow file and folder with same name
        
        if (existingFile) {
             return NextResponse.json({ error: "A file with this name already exists in the destination" }, { status: 409 });
        }
    }

    const updatedFile = await prisma.file.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedFile);
  } catch (error: any) {
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}