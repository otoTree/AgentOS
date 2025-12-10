import Link from "next/link";

export function QuickActions() {
    return (
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
    );
}
