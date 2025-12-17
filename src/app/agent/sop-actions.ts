'use server';

import { modifySopWithChat } from "@/lib/ai/ai-sop";
import { SOPSequence } from "@/lib/ai/sop-types";

export async function modifySop(currentWorkflow: SOPSequence, instruction: string) {
    try {
        return await modifySopWithChat(currentWorkflow, instruction);
    } catch (error) {
        console.error("Failed to modify SOP:", error);
        throw new Error("Failed to modify SOP");
    }
}
