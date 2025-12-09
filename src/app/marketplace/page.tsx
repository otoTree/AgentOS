import { getMarketplaceProjects } from "@/app/actions";
import Link from "next/link";
import { auth } from "@/auth";
import NavBar from "@/components/nav-bar";

export const dynamic = 'force-dynamic';

export default async function Marketplace({
    searchParams
}: {
    searchParams: { category?: string; sort?: string }
}) {
    const session = await auth();
    const category = searchParams.category || 'All';
    const sort = (searchParams.sort as 'latest' | 'popular') || 'latest';

    const projects = await getMarketplaceProjects(category, sort);

    const categories = ['All', 'AI', 'Data', 'Web', 'Tools', 'Fun'];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <NavBar />

            <main className="container max-w-7xl mx-auto px-6 py-6">
                
                {/* Filters & Sort */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Agent Tools</h1>
                        <p className="text-muted-foreground">Explore community-built tools ready for Agent integration.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        {/* Category Tabs */}
                        <div className="flex p-1 bg-muted/50 rounded-lg border">
                            {categories.map(cat => (
                                <Link
                                    key={cat}
                                    href={`/marketplace?category=${cat}&sort=${sort}`}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                                        category === cat
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                                >
                                    {cat}
                                </Link>
                            ))}
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative">
                             {/* Fallback UI for sorting since I didn't make a client component */}
                             <div className="flex items-center border rounded-lg overflow-hidden divide-x bg-card">
                                <Link 
                                    href={`/marketplace?category=${category}&sort=latest`}
                                    className={`px-3 py-2 text-xs font-medium ${sort === 'latest' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
                                >
                                    Latest
                                </Link>
                                <Link 
                                    href={`/marketplace?category=${category}&sort=popular`}
                                    className={`px-3 py-2 text-xs font-medium ${sort === 'popular' ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted'}`}
                                >
                                    Popular
                                </Link>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {projects.map((project: any) => (
                        <Link
                            key={project.id}
                            href={`/marketplace/project/${project.id}`}
                            className="group flex flex-col justify-between bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {project.avatar ? (
                                            <img src={project.avatar} alt={project.name} className="w-10 h-10 rounded-lg object-cover border" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                {project.name[0]}
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground font-medium line-clamp-1">by {project.user?.name || 'Anonymous'}</span>
                                            <span className="text-[10px] text-muted-foreground/70">{new Date(project.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium border border-border/50">
                                        {project.category}
                                    </span>
                                </div>
                                
                                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed h-[4.5em]">
                                    {project.description || "No description provided."}
                                </p>
                            </div>

                            <div className="px-6 py-3 bg-muted/30 border-t flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                    <span className="font-semibold text-foreground">{project.callCount}</span> calls
                                </div>
                                <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:underline">
                                    View Details &rarr;
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className="text-center py-24 border border-dashed rounded-2xl bg-muted/5">
                        <h3 className="text-lg font-medium mb-2">No projects found</h3>
                        <p className="text-muted-foreground text-sm">Be the first to publish a function in this category!</p>
                    </div>
                )}

            </main>
        </div>
    );
}