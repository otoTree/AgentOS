import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getEmail } from "@/app/actions";
import Link from "next/link";

export default async function EmailDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const email = await getEmail(params.id);

  if (!email) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6 px-6 max-w-4xl">
        <div className="mb-6">
            <Link href="/dashboard/email" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                ← Back to Inbox
            </Link>
        </div>

        <div className="bg-card border rounded-xl p-8 shadow-sm">
            <header className="border-b pb-6 mb-6">
                <h1 className="text-2xl font-bold mb-4">{email.subject || "(No Subject)"}</h1>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-12 text-sm">From:</span>
                            <span className="font-medium">{email.from}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-muted-foreground w-12 text-sm">To:</span>
                            <span className="text-sm">{email.to}</span>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {new Date(email.receivedAt).toLocaleString()}
                    </div>
                </div>
            </header>

            <div className="prose max-w-none dark:prose-invert">
                {email.html ? (
                    <div dangerouslySetInnerHTML={{ __html: email.html }} />
                ) : (
                    <pre className="whitespace-pre-wrap font-sans">{email.body}</pre>
                )}
            </div>
        </div>
    </div>
  );
}