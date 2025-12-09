import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavBar from "@/components/nav-bar";
import { getAuditData } from "./actions";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const { stats, projects } = await getAuditData();

  // Prepare data for charts
  const topProjects = projects.slice(0, 5);
  const maxCallCount = topProjects.length > 0 ? topProjects[0].callCount : 0;

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="container max-w-6xl py-6 mx-auto px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit Log</h1>
          <p className="mt-2 text-muted-foreground">
            Detailed usage statistics and audit trail for your projects.
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-12">
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Current Credits</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.totalCredits}</span>
            </div>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total Calls</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.totalCalls.toLocaleString()}</span>
            </div>
          </div>
           <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total Projects</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.totalProjects}</span>
            </div>
          </div>
           <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">Total Deployments</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.totalDeployments}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          {/* Top Projects Chart */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">Top Projects by Usage</h3>
            {topProjects.length > 0 ? (
              <div className="space-y-4">
                {topProjects.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-muted-foreground">{project.callCount} calls</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${maxCallCount > 0 ? (project.callCount / maxCallCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No usage data available yet.
              </div>
            )}
          </div>

          {/* Recent Activity List */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-6">Project Status Overview</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-muted-foreground border-b pb-2">
                    <span>Project Name</span>
                    <span>Last Called</span>
                    <span>Status</span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {projects.map((project) => (
                        <div key={project.id} className="flex justify-between items-center text-sm">
                            <span className="truncate max-w-[150px]" title={project.name}>{project.name}</span>
                            <span className="text-muted-foreground">
                                {project.lastCalled 
                                    ? new Date(project.lastCalled).toLocaleDateString() 
                                    : 'Never'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                project.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {project.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    ))}
                     {projects.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                            No projects found.
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}