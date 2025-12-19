import { auth } from "@/auth";
import { headers } from "next/headers";
// TODO: Implement ApiTokenRepository if needed for external API access
// For now, we only support session auth or assume apiTokenRepository exists
// import { apiTokenRepository } from "@/lib/repositories/api-token-repository";

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
    // const token = authHeader.substring(7);
    
    // const apiToken = await apiTokenRepository.findByToken(token);

    // if (apiToken) {
    //   // Update last used
    //   await apiTokenRepository.update(apiToken.id, { lastUsed: new Date() });

    //   return { id: apiToken.userId, type: "api_token" };
    // }
    console.warn("API Token auth not yet fully migrated to Redis");
  }

  return null;
}
