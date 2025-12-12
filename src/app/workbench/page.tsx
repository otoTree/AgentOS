import { auth } from "@/auth";
import { getProjects, createProject } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectCardMenu from "@/components/dashboard/project-card-menu";
import NavBar from "@/components/nav-bar";

export default async function Workbench() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container max-w-6xl py-6 mx-auto px-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Workbench
              </h1>
            </div>
            <p className="mt-2 text-muted-foreground">Manage and edit your serverless functions.</p>
          </div>
          
          <form action={async () => {
            "use server";
            await createProject("Untitled Project");
          }}>
            <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02] hover:shadow-lg h-10 px-6 py-2 shadow-md">
              + New Project
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                   <div className="flex items-center gap-3">
                      {project.avatar ? (
                          <img src={project.avatar} alt={project.name} className="w-10 h-10 rounded-lg object-cover border" />
                      ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                              {project.name[0]}
                          </div>
                      )}
                      <h2 className="font-semibold text-xl leading-tight group-hover:text-primary transition-colors">{project.name}</h2>
                   </div>
                  <div className="-mt-1 -mr-2">
                      <ProjectCardMenu
                          projectId={project.id}
                          projectName={project.name}
                          projectDescription={project.description}
                          projectAvatar={project.avatar}
                      />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {project.description || "No description provided."}
                </p>
              </div>
              <div className="px-6 py-3 mt-auto border-t bg-muted/30 group-hover:bg-muted/50 transition-colors">
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    
                    {project.deployments && project.deployments.length > 0 ? (
                      <span className="flex items-center gap-1.5 text-green-700 font-semibold bg-green-100/50 px-2.5 py-1 rounded-full border border-green-200/50">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live
                      </span>
                    ) : (
                      <span className="text-muted-foreground/70 italic">Not deployed</span>
                    )}
                 </div>
              </div>
            </Link>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed rounded-2xl text-muted-foreground bg-muted/10">
              <p className="mb-4 text-lg font-medium text-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground mb-8">Create your first Python function to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}