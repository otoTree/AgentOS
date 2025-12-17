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
    <div className="min-h-screen bg-zinc-50/50">
      <NavBar />
      <div className="container max-w-6xl py-12 mx-auto px-6">
        <header className="flex items-end justify-between mb-12">
          <div>
            <h1 className="text-4xl font-serif font-light tracking-tight text-zinc-900">
              Workbench
            </h1>
            <p className="mt-3 text-zinc-500 font-light">Manage and edit your serverless functions.</p>
          </div>
          
          <form action={async () => {
            "use server";
            await createProject("Untitled Project");
          }}>
            <button className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-all bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] hover:shadow-lg h-10 px-6 py-2 shadow-sm">
              + New Project
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-200/50"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                   <div className="flex items-center gap-4">
                      {project.avatar ? (
                          <img src={project.avatar} alt={project.name} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                      ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 font-serif font-medium text-xl">
                              {project.name[0]}
                          </div>
                      )}
                      <h2 className="font-medium text-lg text-zinc-900 group-hover:text-zinc-600 transition-colors">{project.name}</h2>
                   </div>
                  <div className="-mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ProjectCardMenu
                          projectId={project.id}
                          projectName={project.name}
                          projectDescription={project.description}
                          projectAvatar={project.avatar}
                      />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-3 leading-relaxed font-light">
                  {project.description || "No description provided."}
                </p>
              </div>
              <div className="px-8 py-4 mt-auto border-t border-zinc-50 bg-zinc-50/30">
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    
                    {project.deployments && project.deployments.length > 0 ? (
                      <span className="flex items-center gap-2 text-emerald-600 font-medium px-2 py-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        Live
                      </span>
                    ) : (
                      <span className="text-zinc-300 italic">Draft</span>
                    )}
                 </div>
              </div>
            </Link>
          ))}
          
          {projects.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
              <p className="mb-2 text-lg font-medium text-zinc-900">No projects yet</p>
              <p className="text-sm text-zinc-500 mb-8">Create your first function to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}