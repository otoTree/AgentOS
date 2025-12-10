import { getConversations } from "./actions";
import { getUserProfile } from "./user-actions";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "./sidebar";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const [conversations, user] = await Promise.all([
    getConversations(),
    getUserProfile()
  ]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar initialConversations={conversations || []} user={user} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
            {children}
        </main>
      </div>
    </div>
  );
}