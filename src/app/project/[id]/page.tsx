import { auth } from "@/auth";
import { getProject } from "@/app/actions";
import { redirect } from "next/navigation";
import ClientEditor from "@/app/project/[id]/client-editor";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const project = await getProject(params.id);
  if (!project) {
    redirect("/dashboard");
  }

  // ClientEditor is strictly for editing now. Public view is in marketplace.
  return <ClientEditor project={project} isOwner={true} />;
}