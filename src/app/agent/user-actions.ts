'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { FileStorage } from "@/lib/storage/file-storage";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
    }
  });

  if (user?.image && !user.image.startsWith('http') && !user.image.startsWith('data:')) {
      try {
          user.image = await FileStorage.getSignedDownloadUrl(user.image);
      } catch (e) {
          console.error("Failed to sign avatar url", e);
      }
  }

  return user;
}

export async function updateUserProfile(data: { name?: string, username?: string }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            ...data
        }
    });

    revalidatePath("/agent");
}

export async function uploadAvatar(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    const file = formData.get('file') as File;
    if (!file) throw new Error("No file uploaded");

    const buffer = Buffer.from(await file.arrayBuffer());
    // Use a fixed key for avatar to overwrite previous one, or unique?
    // If unique, we accumulate junk. Let's use `avatar.png` or similar, but browser caching might be an issue.
    // S3 keys are usually unique to avoid cache issues or we use versioning.
    // Let's use timestamp.
    const key = `avatars/${session.user.id}/${Date.now()}-${file.name}`;
    
    await FileStorage.uploadFile(key, buffer, file.type);
    
    // Update user with the KEY
    await prisma.user.update({
        where: { id: session.user.id },
        data: { image: key }
    });

    revalidatePath("/agent");
    return key;
}

export async function getApiToken() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    
    const token = await prisma.apiToken.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    });
    
    return token?.token;
}

export async function generateApiToken() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    
    const tokenString = `sk-${crypto.randomBytes(24).toString('hex')}`;
    
    await prisma.apiToken.create({
        data: {
            name: 'Default Token',
            token: tokenString,
            userId: session.user.id
        }
    });
    
    revalidatePath("/agent");
    return tokenString;
}
