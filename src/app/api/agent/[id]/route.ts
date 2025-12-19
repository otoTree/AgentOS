import { auth } from "@/auth";
import { chatRepository } from "@/lib/repositories/chat-repository";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const conversation = await chatRepository.findWithDetails(params.id);

  if (!conversation || conversation.userId !== session.user.id) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json(conversation);
}
