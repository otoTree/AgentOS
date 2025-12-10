import { getConversations } from "./actions";
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

  const conversations = await getConversations();

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar initialConversations={conversations || []} />
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
            {children}
        </main>
      </div>
    </div>
  );
}