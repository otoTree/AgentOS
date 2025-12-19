import { emailRepository } from "@/lib/repositories/email-repository";

export async function handleEmailTool(call: any, userId: string) {
    if (call.name === 'email_list') {
        try {
            const limit = Math.min(call.arguments?.limit || 10, 50); // Max 50
            const query = (call.arguments?.query || '').toLowerCase();
            const page = call.arguments?.page || 1;
            const skip = (page - 1) * limit;

            // TODO: Implement search filtering in Redis if needed.
            // For now, we fetch latest and filter in memory (inefficient for large datasets but ok for MVP)
            // Or we just return latest emails.
            
            const emails = await emailRepository.findByUserId(userId, 100, 0); // Fetch last 100
            
            let filtered = emails;
            if (query) {
                filtered = emails.filter(e => 
                    (e.subject && e.subject.toLowerCase().includes(query)) ||
                    (e.from && e.from.toLowerCase().includes(query)) ||
                    (e.body && e.body.toLowerCase().includes(query))
                );
            }
            
            // Pagination
            const paged = filtered.slice(skip, skip + limit);

            if (paged.length === 0) {
                return "No emails found.";
            }

            return "Emails:\n" + paged.map(e => 
                `- [${e.isRead ? 'READ' : 'UNREAD'}] ${e.subject || '(No Subject)'}\n  From: ${e.from}\n  Date: ${new Date(e.receivedAt).toLocaleString()}\n  ID: ${e.id}`
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

            const email = await emailRepository.findById(emailId);

            if (!email || email.userId !== userId) {
                return "Email not found or unauthorized.";
            }

            // Mark as read if not already
            if (!email.isRead) {
                await emailRepository.update(email.id, { isRead: true });
            }

            let content = `Subject: ${email.subject || '(No Subject)'}\n`;
            content += `From: ${email.from}\n`;
            content += `To: ${email.to}\n`;
            content += `Date: ${new Date(email.receivedAt).toLocaleString()}\n`;
            content += `\n--- Body ---\n`;
            content += email.body || "(No plain text body)";
            
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
