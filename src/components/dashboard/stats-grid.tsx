import Link from "next/link";

interface Stats {
    projectCount: number;
    activeDeployments: number;
    totalCalls: number;
    credits: number;
}

interface StatsGridProps {
    stats: Stats;
}

export function StatsGrid({ stats }: StatsGridProps) {
    return (
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
    );
}
