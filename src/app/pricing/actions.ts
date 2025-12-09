'use server'

import { auth } from "@/auth";
import { prisma } from "@/lib/infra/prisma";
import { revalidatePath } from "next/cache";

export async function purchaseCredits(amount: number, cost: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // Simulation of payment verification
    // In real app: await verifyPayment(paymentId);

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            credits: { increment: amount }
        }
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/pricing");
    return { success: true, newCredits: amount };
}

export async function purchaseStorage(bytes: number, cost: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // Simulation of payment verification

    // Prisma doesn't support direct increment for BigInt in update data yet in all versions nicely without raw query or specific syntax, 
    // but let's try the standard increment if supported or read-update-write.
    // Actually, BigInt increment is supported in modern Prisma.
    
    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            storageLimit: { increment: bytes }
        }
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/pricing");
    return { success: true, addedStorage: bytes };
}