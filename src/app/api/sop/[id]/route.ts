import { NextRequest, NextResponse } from "next/server";
import { sopWorkflowRepository } from "@/lib/repositories/sop-workflow-repository";
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
    const sop = await sopWorkflowRepository.findById(params.id);

    if (!sop || sop.userId !== user.id) {
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

    // Verify ownership
    const existing = await sopWorkflowRepository.findById(params.id);
    if (!existing || existing.userId !== user.id) {
        return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    const sop = await sopWorkflowRepository.update(params.id, {
        name,
        description,
        graph,
        deployed
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
    // Verify ownership
    const existing = await sopWorkflowRepository.findById(params.id);
    if (!existing || existing.userId !== user.id) {
        return new NextResponse("Not Found or Unauthorized", { status: 404 });
    }

    await sopWorkflowRepository.delete(params.id);

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("Failed to delete SOP:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
