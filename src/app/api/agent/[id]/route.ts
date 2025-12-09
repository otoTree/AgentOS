import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const conversation = await prisma.agentConversation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      tools: {
        include: {
          tool: true
        }
      },
      files: {
        include: {
          file: true
        }
      }
    }
  });

  if (!conversation) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(conversation);
}