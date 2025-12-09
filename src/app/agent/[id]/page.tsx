import { getConversation } from "../actions";
import { redirect } from "next/navigation";
import ChatInterface from "./client-page";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const conversation = await getConversation(params.id);
  
  if (!conversation) {
    redirect("/agent");
  }

  return (
    <ChatInterface 
        conversation={conversation} 
    />
  );
}