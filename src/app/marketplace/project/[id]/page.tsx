import { getPublicProject, getProjectComments } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import CommentsSection from "./comments-section";
import MarketplaceViewer from "./marketplace-viewer";

// Force TS re-check: Import verified by CLI
export default async function PublicProjectPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const project = await getPublicProject(params.id);
  const comments = await getProjectComments(params.id);

  if (!project) {
    redirect("/marketplace");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
       <header className="h-16 border-b flex items-center px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
         <div className="container max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1">
                    &larr; Back to Marketplace
                </Link>
                <div className="h-4 w-px bg-border/50"></div>
                <h1 className="font-semibold text-lg">{project.name}</h1>
            </div>
            {session?.user?.id === project.userId && (
                <Link href={`/project/${project.id}`} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90">
                    Edit Project
                </Link>
            )}
         </div>
       </header>

       <main className="container max-w-5xl mx-auto px-6 py-12">
          <section className="mb-12">
              <div className="flex items-start gap-6">
                  {project.avatar && (
                    <img src={project.avatar} alt={project.name} className="w-24 h-24 rounded-2xl border object-cover shadow-sm" />
                  )}
                  <div>
                     <h2 className="text-3xl font-bold mb-2">{project.name}</h2>
                     <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                            {project.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                            by {project.user?.name || 'Anonymous'}
                        </span>
                     </div>
                     <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {project.description || "No description provided."}
                    </div>
                  </div>
              </div>
          </section>

          <MarketplaceViewer deployments={project.deployments} />

          <section className="pt-12 border-t mt-12 max-w-3xl">
              <CommentsSection
                  projectId={project.id}
                  initialComments={comments}
                  isAuthenticated={!!session?.user}
              />
          </section>
       </main>
    </div>
  );
}
