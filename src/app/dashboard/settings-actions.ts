'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { revalidatePath } from "next/cache";
import { UserConfig, updateUserConfig } from "@/lib/infra/config";

export async function updateUserOpenAIConfig(apiKey: string, baseUrl: string, model: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // 使用 updateUserConfig 统一更新
  await updateUserConfig(session.user.id, {
    ai: {
      openai: {
        apiKey: apiKey || undefined,
        baseUrl: baseUrl || undefined,
        model: model || undefined,
      }
    }
  });

  revalidatePath("/dashboard");
}

export async function updateUserProfile(name: string, image?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  if (!name || name.trim().length === 0) {
    throw new Error("Name is required");
  }

  if (name.length > 50) {
     throw new Error("Name is too long (max 50 characters)");
  }

  // 使用 updateUserConfig 统一更新
  const profileUpdate: any = {
    name: name.trim(),
  };

  if (image !== undefined) {
    profileUpdate.image = image;
  }

  await updateUserConfig(session.user.id, {
    profile: profileUpdate
  });

  revalidatePath("/dashboard");
  revalidatePath("/marketplace"); // Update marketplace to reflect author name change
}

export async function updateUserUsername(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const cleanUsername = username.trim().toLowerCase();

  if (!cleanUsername) {
    throw new Error("Username is required");
  }

  // Validation
  if (cleanUsername.length < 3) {
    throw new Error("Username must be at least 3 characters");
  }
  if (cleanUsername.length > 20) {
    throw new Error("Username must be at most 20 characters");
  }
  
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    throw new Error("Username can only contain lowercase letters, numbers, and underscores");
  }

  // Reserved words
  const reservedWords = [
    'admin', 'administrator', 'root', 'system', 'support', 'help', 'info',
    'noreply', 'webmaster', 'security', 'abuse', 'postmaster', 'host',
    'api', 'www', 'mail', 'email', 'account', 'login', 'signin', 'signout',
    'dashboard', 'profile', 'settings', 'auth'
  ];
  
  if (reservedWords.includes(cleanUsername)) {
     throw new Error("This username is reserved");
  }

  // Check uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { username: cleanUsername }
  });

  if (existingUser && existingUser.id !== session.user.id) {
    throw new Error("Username is already taken");
  }

  // 使用 updateUserConfig 统一更新
  await updateUserConfig(session.user.id, {
    profile: {
      username: cleanUsername
    }
  });

  revalidatePath("/dashboard");
}

export async function generateApiToken(name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  if (!name) {
    throw new Error("Token name is required");
  }

  // Generate a random token (e.g., sk-sand-...)
  const token = `sk-sand-${crypto.randomUUID().replace(/-/g, "")}`;

  const apiToken = await prisma.apiToken.create({
    data: {
      name,
      token,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  return apiToken;
}

export async function revokeApiToken(tokenId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  await prisma.apiToken.deleteMany({
    where: {
      id: tokenId,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
}

export async function getApiTokens() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return prisma.apiToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}