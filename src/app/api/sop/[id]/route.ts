import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const sop = await prisma.sopWorkflow.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!sop) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(sop);
  } catch (error) {
    console.error("Failed to fetch SOP:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, graph, deployed } = body;

    const sop = await prisma.sopWorkflow.update({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        name,
        description,
        graph,
        deployed,
      },
    });

    return NextResponse.json(sop);
  } catch (error) {
    console.error("Failed to update SOP:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prisma.sopWorkflow.delete({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("Failed to delete SOP:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
