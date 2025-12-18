
import { prisma } from "@/lib/infra/prisma";

export async function handleEmailTool(call: any, userId: string) {
    if (call.name === 'email_list') {
        try {
            const limit = Math.min(call.arguments?.limit || 10, 50); // Max 50
            const query = (call.arguments?.query || '').toLowerCase();
            const page = call.arguments?.page || 1;
            const skip = (page - 1) * limit;

            const whereClause: any = {
                userId: userId
            };

            if (query) {
                whereClause.OR = [
                    { subject: { contains: query, mode: 'insensitive' } },
                    { from: { contains: query, mode: 'insensitive' } },
                    { body: { contains: query, mode: 'insensitive' } }
                ];
            }

            const emails = await prisma.email.findMany({
                where: whereClause,
                orderBy: { receivedAt: 'desc' },
                take: limit,
                skip: skip,
                select: {
                    id: true,
                    subject: true,
                    from: true,
                    receivedAt: true,
                    isRead: true
                }
            });

            if (emails.length === 0) {
                return "No emails found.";
            }

            return "Emails:\n" + emails.map(e => 
                `- [${e.isRead ? 'READ' : 'UNREAD'}] ${e.subject || '(No Subject)'}\n  From: ${e.from}\n  Date: ${e.receivedAt.toLocaleString()}\n  ID: ${e.id}`
            ).join('\n\n');

        } catch (e: any) {
            console.error("Error listing emails:", e);
            return "Error listing emails: " + e.message;
        }
    }

    if (call.name === 'email_get') {
        try {
            const emailId = call.arguments?.emailId;
            if (!emailId) return "Error: emailId is required.";

            const email = await prisma.email.findUnique({
                where: { 
                    id: emailId,
                    userId: userId // Security check
                }
            });

            if (!email) {
                return "Email not found or unauthorized.";
            }

            // Mark as read if not already
            if (!email.isRead) {
                await prisma.email.update({
                    where: { id: email.id },
                    data: { isRead: true }
                });
            }

            let content = `Subject: ${email.subject || '(No Subject)'}\n`;
            content += `From: ${email.from}\n`;
            content += `To: ${email.to}\n`;
            content += `Date: ${email.receivedAt.toLocaleString()}\n`;
            content += `\n--- Body ---\n`;
            content += email.body || "(No plain text body)";
            
            // If there is HTML content, we might want to mention it or strip tags, 
            // but for an LLM, plain text 'body' is usually preferred if available.
            // If body is empty but html exists, we could try to use that (maybe strip tags).
            if (!email.body && email.html) {
                 content += "\n(Content is HTML-only)\n" + email.html;
            }

            return content;

        } catch (e: any) {
            console.error("Error reading email:", e);
            return "Error reading email: " + e.message;
        }
    }

    return null;
}
