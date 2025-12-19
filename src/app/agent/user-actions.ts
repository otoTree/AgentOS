'use server'

import { auth } from "@/auth";
import { userRepository } from "@/lib/repositories/auth-repository";
import { apiTokenRepository } from "@/lib/repositories/api-token-repository";
import { FileStorage } from "@/lib/storage/file-storage";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await userRepository.findById(session.user.id);

  if (user?.image && !user.image.startsWith('http') && !user.image.startsWith('data:')) {
      try {
          user.image = await FileStorage.getSignedDownloadUrl(user.image);
      } catch (e) {
          console.error("Failed to sign avatar url", e);
      }
  }

  // Filter sensitive data
  if (user) {
      const { password, ...safeUser } = user;
      return safeUser;
  }

  return user;
}

export async function updateUserProfile(data: { name?: string, username?: string }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    await userRepository.update(session.user.id, data);

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
    await userRepository.update(session.user.id, { image: key });

    revalidatePath("/agent");
    return key;
}

export async function getApiToken() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    
    const tokens = await apiTokenRepository.findByUserId(session.user.id);
    const token = tokens.length > 0 ? tokens[0] : null;
    
    return token?.token;
}

export async function generateApiToken() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");
    
    const tokenString = `sk-${crypto.randomBytes(24).toString('hex')}`;
    
    await apiTokenRepository.create({
        name: 'Default Token',
        token: tokenString,
        userId: session.user.id
    });
    
    revalidatePath("/agent");
    return tokenString;
}
