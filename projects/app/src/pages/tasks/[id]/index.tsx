import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useRouter } from 'next/router';
import { Task, TaskArtifact, TaskService } from '@/service/task';
import { Card, CardHeader, CardTitle, CardContent } from '@agentos/web/components/ui/card';
import { Badge } from '@agentos/web/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@agentos/web/components/ui/tabs';
// import { CodeEditor } from '@/components/ui/code-editor'; // Use local component if shared one missing
import { format } from 'date-fns';
import { ExternalLink, FileIcon, Terminal } from 'lucide-react';

export default function TaskDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [task, setTask] = useState<Task | null>(null);
    const [artifacts, setArtifacts] = useState<TaskArtifact[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id && typeof id === 'string') {
            const fetchData = async () => {
                try {
                    const [taskData, artifactsData] = await Promise.all([
                        TaskService.getTask(id),
                        TaskService.getTaskArtifacts(id)
                    ]);
                    setTask(taskData);
                    setArtifacts(artifactsData);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
            
            // Poll for updates if processing
            const interval = setInterval(async () => {
                if (task?.status === 'processing' || task?.status === 'queued') {
                    const updatedTask = await TaskService.getTask(id);
                    setTask(updatedTask);
                    if (updatedTask.status === 'completed' || updatedTask.status === 'failed') {
                        // Fetch final artifacts
                        const updatedArtifacts = await TaskService.getTaskArtifacts(id);
                        setArtifacts(updatedArtifacts);
                        clearInterval(interval);
                    }
                }
            }, 3000);
            
            return () => clearInterval(interval);
        }
    }, [id, task?.status]);

    if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;
    if (!task) return <AdminLayout><div>Task not found</div></AdminLayout>;

    return (
        <AdminLayout>
            <div className="container mx-auto py-8 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">Task Execution</h1>
                        <p className="text-muted-foreground font-mono text-sm">{task.id}</p>
                    </div>
                    <Badge variant={task.status === 'completed' ? 'default' : task.status === 'failed' ? 'destructive' : 'secondary'}>
                        {task.status}
                    </Badge>
                </div>

                {/* Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-muted-foreground block text-sm">Type</span>
                            <span className="font-medium capitalize">{task.type}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-sm">Created At</span>
                            <span>{format(new Date(task.createdAt), 'PPpp')}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-muted-foreground block text-sm">Instruction</span>
                            <p className="mt-1">{task.instruction || '-'}</p>
                        </div>
                        {task.error && (
                            <div className="col-span-2 text-red-500">
                                <span className="block text-sm font-semibold">Error</span>
                                <pre className="mt-1 bg-red-50 p-2 rounded text-sm overflow-auto">{task.error}</pre>
                            </div>
                        )}
                        {task.result && (
                            <div className="col-span-2">
                                <span className="text-muted-foreground block text-sm">Result</span>
                                <p className="mt-1 font-medium">{task.result}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs: Context, Artifacts, Logs */}
                <Tabs defaultValue="context">
                    <TabsList>
                        <TabsTrigger value="context">Execution Context</TabsTrigger>
                        <TabsTrigger value="artifacts">Artifacts ({artifacts.length})</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="context" className="mt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                                    {JSON.stringify(task.pipelineContext || {}, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="artifacts" className="mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {artifacts.map(artifact => (
                                <Card key={artifact.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded">
                                            <FileIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="font-medium truncate" title={artifact.name}>{artifact.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {artifact.size ? `${(artifact.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                                            </p>
                                        </div>
                                        <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </CardContent>
                                </Card>
                            ))}
                            {artifacts.length === 0 && (
                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                    No artifacts generated.
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
