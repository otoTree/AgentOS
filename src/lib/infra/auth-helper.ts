import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { headers } from "next/headers";

export async function getAuthenticatedUser() {
  // 1. Check Session (Web UI)
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id, type: "session" };
  }

  // 2. Check API Token (External API)
  const headersList = headers();
  const authHeader = headersList.get("authorization");
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (apiToken) {
      // Update last used
      await prisma.apiToken.update({
        where: { id: apiToken.id },
        data: { lastUsed: new Date() },
      });

      return { id: apiToken.userId, type: "api_token" };
    }
  }

  return null;
}