
'use client';

import { useState, useEffect } from 'react';
import { getProjects, createProject } from '@/app/actions';
import Link from 'next/link';
import ProjectCardMenu from '@/app/dashboard/project-card-menu';
import { Plus, Loader2 } from 'lucide-react';

export function WorkbenchPanel() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      await createProject("Untitled Project");
      await loadProjects();
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col p-4 bg-background">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Workbench Projects</h2>
        <button 
          onClick={handleCreateProject}
          disabled={isCreating}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          New Project
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 overflow-y-auto pb-4">
        {projects.map((project: any) => (
          <Link
            key={project.id}
            href={`/project/${project.id}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all hover:border-primary/50"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                 <div className="flex items-center gap-3">
                    {project.avatar ? (
                        <img src={project.avatar} alt={project.name} className="w-8 h-8 rounded-lg object-cover border" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {project.name[0]}
                        </div>
                    )}
                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{project.name}</h3>
                 </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {project.description || "No description provided."}
              </p>
            </div>
            <div className="px-4 py-2 mt-auto border-t bg-muted/30 text-xs text-muted-foreground flex justify-between items-center">
               <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
               {project.deployments?.length > 0 && (
                   <span className="text-green-600 font-medium flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Live
                   </span>
               )}
            </div>
          </Link>
        ))}
        
        {projects.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                No projects yet.
            </div>
        )}
      </div>
    </div>
  );
}
