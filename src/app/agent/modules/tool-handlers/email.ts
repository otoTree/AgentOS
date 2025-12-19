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
                return JSON.stringify({ emails: [], total: 0, message: "No emails found." });
            }

            return JSON.stringify({
                emails: paged.map(e => ({
                    id: e.id,
                    subject: e.subject || '(No Subject)',
                    from: e.from,
                    date: new Date(e.receivedAt).toLocaleString(),
                    isRead: e.isRead,
                    snippet: e.body ? e.body.substring(0, 100) : ''
                })),
                total: filtered.length,
                page,
                limit
            });

        } catch (e: any) {
            console.error("Error listing emails:", e);
            return JSON.stringify({ error: e.message });
        }
    }

    if (call.name === 'email_get') {
        try {
            const emailId = call.arguments?.emailId;
            if (!emailId) return JSON.stringify({ error: "emailId is required." });

            const email = await emailRepository.findById(emailId);

            if (!email || email.userId !== userId) {
                return JSON.stringify({ error: "Email not found or unauthorized." });
            }

            // Mark as read if not already
            if (!email.isRead) {
                await emailRepository.update(email.id, { isRead: true });
            }

            return JSON.stringify({
                id: email.id,
                subject: email.subject || '(No Subject)',
                from: email.from,
                to: email.to,
                date: new Date(email.receivedAt).toLocaleString(),
                body: email.body || "(No plain text body)",
                html: email.html
            });

        } catch (e: any) {
            console.error("Error reading email:", e);
            return JSON.stringify({ error: e.message });
        }
    }

    return null;
}
