'use server'

import { auth } from "@/auth";
import { userRepository } from "@/lib/repositories/auth-repository";
import { revalidatePath } from "next/cache";

export async function purchaseCredits(amount: number, cost: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Not authenticated");
    }

    // Simulation of payment verification
    // In real app: await verifyPayment(paymentId);

    const user = await userRepository.findById(session.user.id);
    if (!user) throw new Error("User not found");

    await userRepository.update(session.user.id, {
        credits: user.credits + amount
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

    const user = await userRepository.findById(session.user.id);
    if (!user) throw new Error("User not found");

    await userRepository.update(session.user.id, {
        storageLimit: Number(user.storageLimit) + bytes
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/pricing");
    return { success: true, addedStorage: bytes };
}