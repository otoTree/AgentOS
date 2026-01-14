import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useTranslation } from 'react-i18next';
import { Task, TaskService } from '@/service/task';
import { useRouter } from 'next/router';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@agentos/web/components/ui/table';
import { Button } from '@agentos/web/components/ui/button';
import { Badge } from '@agentos/web/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@agentos/web/components/ui/card';
import { format } from 'date-fns';

export default function TasksPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    // Hardcode teamId for now or get from context/session
    const teamId = 'default-team-id'; // Replace with actual context

    useEffect(() => {
        // Need to fetch teamId first.
        // For MVP, assume we can get it from an API or user profile.
        // Let's just list tasks for current user's team?
        // TaskService.getTasks needs teamId.
        
        // Temporary: fetch from API /api/team or similar?
        // Or assume we are in a team context.
        // Let's fetch user's first team.
        const fetchTasks = async () => {
            try {
                // Fetch user info to get teamId (hack)
                const userRes = await fetch('/api/user/status');
                const userData = await userRes.json();
                const tid = userData.teamId; // Assuming this exists or we need to add it
                
                if (tid) {
                    const data = await TaskService.getTasks(tid);
                    setTasks(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        
        fetchTasks();
    }, []);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'completed': return 'default'; // primary
            case 'processing': return 'secondary';
            case 'failed': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <AdminLayout>
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('tasks.title', 'Execution Tasks')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Instruction</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : tasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-mono text-xs">{task.id.slice(0, 8)}...</TableCell>
                                        <TableCell><Badge variant="outline">{task.type}</Badge></TableCell>
                                        <TableCell className="max-w-md truncate" title={task.instruction}>
                                            {task.instruction || (task.pipelineDefinition ? 'Pipeline Execution' : '-')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(task.status) as any}>
                                                {task.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(task.createdAt), 'MMM d, HH:mm')}</TableCell>
                                        <TableCell>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => router.push(`/tasks/${task.id}`)}
                                            >
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!loading && tasks.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No tasks found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
