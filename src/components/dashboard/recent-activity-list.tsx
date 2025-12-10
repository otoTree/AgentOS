import Link from "next/link";

interface Project {
    id: string;
    name: string;
    avatar?: string | null;
    updatedAt: string | Date;
    deployments?: any[];
}

interface RecentActivityListProps {
    activities: Project[];
}

export function RecentActivityList({ activities }: RecentActivityListProps) {
    return (
        <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <Link href="/workbench" className="text-sm text-primary hover:underline">
                    View All Projects &rarr;
                </Link>
            </div>
            
            <div className="space-y-4">
                {activities.map((project) => (
                    <Link 
                        key={project.id}
                        href={`/project/${project.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            {project.avatar ? (
                                <img src={project.avatar} alt={project.name} className="w-10 h-10 rounded-lg object-cover border" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {project.name[0]}
                                </div>
                            )}
                            <div>
                                <h4 className="font-medium text-foreground">{project.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {project.deployments && project.deployments.length > 0 ? (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800">
                                    Live
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                                    Draft
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
                
                {activities.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg text-muted-foreground bg-muted/5">
                        <p>No recent activity found.</p>
                        <Link href="/workbench" className="mt-2 text-primary hover:underline">
                            Go to Workbench to create a project
                        </Link>
                        </div>
                )}
            </div>
        </div>
    );
}
