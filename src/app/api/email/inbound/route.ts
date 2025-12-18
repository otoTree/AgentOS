import { prisma } from "@/lib/infra/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Most email webhooks (SendGrid, Mailgun) use multipart/form-data
    const formData = await req.formData();
    
    // Extract fields (support common variations)
    const from = formData.get("from") as string || formData.get("sender") as string || "";
    const to = formData.get("to") as string || formData.get("recipient") as string || "";
    const subject = formData.get("subject") as string || "(No Subject)";
    const body = formData.get("text") as string || formData.get("body-plain") as string || "";
    const html = formData.get("html") as string || formData.get("body-html") as string || "";

    if (!to || !from) {
      return NextResponse.json({ error: "Missing recipient or sender" }, { status: 400 });
    }

    console.log(`[Email Webhook] Received email from ${from} to ${to}`);

    // Parse recipient to find username
    // Supported formats: "User <user@domain.com>", "user@domain.com"
    // We want to extract "user" from "user@..."
    
    // Simple regex to find the email address part
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const match = to.match(emailRegex);
    
    if (!match) {
        console.error(`[Email Webhook] Could not parse recipient email from: ${to}`);
        return NextResponse.json({ error: "Invalid recipient format" }, { status: 200 }); // 200 to prevent retry loops from provider
    }

    const fullEmail = match[1];
    const [localPart] = fullEmail.split('@');
    
    // Check if we have a user with this username or email
    // Note: We store username in lowercase in DB (enforced by our update action), so we should search lowercase
    const targetUsername = localPart.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: targetUsername },
          { email: fullEmail }
        ]
      }
    });

    if (!user) {
      console.log(`[Email Webhook] User not found for username: ${targetUsername}`);
      // We return 200 to acknowledge receipt even if user not found, to stop provider from retrying.
      // In a real system, we might send a bounce back email.
      return NextResponse.json({ message: "User not found, email ignored" }, { status: 200 });
    }

    // Store email
    await prisma.email.create({
      data: {
        userId: user.id,
        from,
        to,
        subject,
        body,
        html: html || undefined,
      }
    });

    console.log(`[Email Webhook] Email stored for user ${user.username}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Email Webhook] Error processing email:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}