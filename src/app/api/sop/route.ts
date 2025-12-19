import { NextRequest, NextResponse } from "next/server";
import { sopWorkflowRepository } from "@/lib/repositories/sop-workflow-repository";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const sops = await sopWorkflowRepository.findByUserId(user.id);
    return NextResponse.json(sops);
  } catch (error) {
    console.error("Failed to fetch SOPs:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, graph } = body;

    if (!name || !graph) {
      return new NextResponse("Name and graph are required", { status: 400 });
    }

    const sop = await sopWorkflowRepository.create({
      name,
      description,
      graph,
      userId: user.id,
      deployed: false // Default
    });

    return NextResponse.json(sop);
  } catch (error) {
    console.error("Failed to create SOP:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
