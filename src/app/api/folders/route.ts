import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";
import { prisma } from "@/lib/infra/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const parentId = searchParams.get("parentId");
  
  const where: any = {
    userId: user.id,
    parentId: parentId || null,
  };

  const folders = await prisma.folder.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json(folders);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, parentId } = body;

    if (!name) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    // Check for duplicate name in the same parent directory
    const existingFolder = await prisma.folder.findFirst({
      where: {
        userId: user.id,
        parentId: parentId || null,
        name,
      },
    });

    if (existingFolder) {
      return NextResponse.json({ error: "A folder with this name already exists" }, { status: 409 });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentId: parentId || null,
        userId: user.id,
      },
    });

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error("Create folder error:", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}