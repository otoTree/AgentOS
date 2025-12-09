import { auth } from "@/auth";
import { getDashboardStats, getRecentActivity } from "@/app/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const stats = await getDashboardStats();
  const recentActivity = await getRecentActivity();

  if (!stats) {
      return <div>Loading...</div>;
  }

  return (
      <div className="container max-w-6xl py-6 mx-auto px-6">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Overview of your serverless functions and usage.</p>
        </header>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Total Projects</h3>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.projectCount}</span>
                </div>
            </div>
            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Active Deployments</h3>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.activeDeployments}</span>
                    <span className="text-sm text-green-600">Live</span>
                </div>
            </div>
            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Total Invocations</h3>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.totalCalls.toLocaleString()}</span>
                </div>
            </div>
            <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
                <h3 className="text-sm font-medium text-muted-foreground">Credits Remaining</h3>
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.credits}</span>
                    <Link href="/dashboard/profile" className="text-xs text-primary hover:underline ml-auto">Manage</Link>
                </div>
            </div>
        </div>

        {/* Recent Activity Section */}
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                    <Link href="/workbench" className="text-sm text-primary hover:underline">
                        View All Projects &rarr;
                    </Link>
                </div>
                
                <div className="space-y-4">
                    {recentActivity.map((project: any) => (
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
                    
                    {recentActivity.length === 0 && (
                         <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg text-muted-foreground bg-muted/5">
                            <p>No recent activity found.</p>
                            <Link href="/workbench" className="mt-2 text-primary hover:underline">
                                Go to Workbench to create a project
                            </Link>
                         </div>
                    )}
                </div>
            </div>

            <div>
                 <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
                 <div className="space-y-3">
                    <Link href="/workbench" className="block w-full p-4 text-left rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                        <span className="block font-medium">Create New Project</span>
                        <span className="text-sm text-muted-foreground">Start a new serverless function</span>
                    </Link>
                     <Link href="/marketplace" className="block w-full p-4 text-left rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                        <span className="block font-medium">Browse Marketplace</span>
                        <span className="text-sm text-muted-foreground">Find templates and examples</span>
                    </Link>
                    <Link href="/dashboard/files" className="block w-full p-4 text-left rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                        <span className="block font-medium">Space</span>
                        <span className="text-sm text-muted-foreground">Manage your personal storage</span>
                    </Link>
                     <Link href="/dashboard/profile" className="block w-full p-4 text-left rounded-lg border bg-card hover:shadow-md hover:border-primary/30 transition-all">
                        <span className="block font-medium">Account Settings</span>
                        <span className="text-sm text-muted-foreground">Manage API keys and credits</span>
                    </Link>
                 </div>
            </div>
        </div>
      </div>
  );
}