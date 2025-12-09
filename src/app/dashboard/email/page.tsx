import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getEmails } from "@/app/actions";
import Link from "next/link";

export default async function EmailPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const emails = await getEmails();

  return (
    <div className="container mx-auto py-6 px-6 max-w-5xl">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Inbox
            </h1>
            <p className="mt-2 text-muted-foreground">
            Your integrated email messages.
            </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm opacity-50 cursor-not-allowed" title="Outbound email coming soon">
            Compose
        </button>
      </header>

      <div className="rounded-xl border bg-card overflow-hidden">
        {emails.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
                <p>No emails yet.</p>
                <p className="text-xs mt-2">Emails sent to your username@domain address will appear here.</p>
            </div>
        ) : (
            <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                    <tr>
                        <th className="px-6 py-3 font-medium text-muted-foreground w-1/4">From</th>
                        <th className="px-6 py-3 font-medium text-muted-foreground w-1/2">Subject</th>
                        <th className="px-6 py-3 font-medium text-muted-foreground text-right">Received</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {emails.map((email) => (
                        <tr key={email.id} className={`hover:bg-muted/20 transition-colors ${!email.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10 font-medium' : ''}`}>
                            <td className="px-6 py-4 truncate max-w-[200px]">
                                {email.from}
                            </td>
                            <td className="px-6 py-4">
                                <Link href={`/dashboard/email/${email.id}`} className="hover:underline block truncate max-w-[400px]">
                                    {email.subject || "(No Subject)"}
                                </Link>
                            </td>
                            <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                                {new Date(email.receivedAt).toLocaleDateString()} {new Date(email.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}