import React, { useEffect, useState } from 'react';
import { getSopExecutions, getSopExecution } from '../../sop-execution-actions';
import { SOPSequence, StepStatus } from '@/lib/ai/sop-types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ChevronRight, RotateCw, History } from 'lucide-react';
import { SOPStepItem } from './SOPStepItem';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SOPHistoryViewProps {
    currentSopId: string;
    sequence: SOPSequence;
}

export function SOPHistoryView({ currentSopId, sequence }: SOPHistoryViewProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [selectedExecution, setSelectedExecution] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadHistory();
    }, [currentSopId]);

    const loadHistory = async () => {
        if (!currentSopId) return;
        setLoading(true);
        try {
            const data = await getSopExecutions(currentSopId);
            setHistory(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExecutionClick = async (executionId: string) => {
        setLoading(true);
        try {
            const detail = await getSopExecution(executionId);
            setSelectedExecution(detail);
            // Pre-expand steps that have output
            const newExpanded: Record<string, boolean> = {};
            if (detail?.tasks) {
                detail.tasks.forEach((task: any) => {
                     newExpanded[task.nodeId] = true;
                });
            }
            setExpandedSteps(newExpanded);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (selectedExecution) {
        // Detail View
        const status: StepStatus = {};
        const stepOutputs: Record<string, string> = {};
        
        // Reconstruct status and outputs from execution tasks
        if (selectedExecution.tasks) {
            selectedExecution.tasks.forEach((task: any) => {
                if (task.status === 'COMPLETED') status[task.nodeId] = 'completed';
                else if (task.status === 'FAILED') status[task.nodeId] = 'pending';
                else status[task.nodeId] = 'running';
                
                if (task.output?.content) {
                    stepOutputs[task.nodeId] = task.output.content;
                } else if (task.output?.error) {
                    stepOutputs[task.nodeId] = `Error: ${task.output.error}`;
                }
            });
        }

        // Deliverables section
        const deliverables = selectedExecution.deliverables;

        return (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center gap-2 border-b pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedExecution(null)} className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="font-semibold text-lg">Execution Details</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(selectedExecution.createdAt), 'PPpp')}
                        </p>
                    </div>
                </div>

                {/* Deliverables */}
                {deliverables && Object.keys(deliverables).length > 0 && (
                     <Card className="bg-muted/10 border-muted">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm font-medium">Deliverables</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0 pb-3 px-4">
                            <pre className="text-xs bg-background p-3 rounded-md border overflow-auto max-h-60 whitespace-pre-wrap font-mono">
                                {JSON.stringify(deliverables, null, 2)}
                            </pre>
                        </CardContent>
                     </Card>
                )}

                <div className="space-y-4">
                    {sequence.steps.map((step, index) => (
                        <SOPStepItem 
                            key={step.id}
                            step={step}
                            index={index}
                            status={status[step.id] || 'pending'}
                            output={stepOutputs[step.id]}
                            isExpanded={expandedSteps[step.id]}
                            onToggleExpand={toggleExpand}
                            onExecute={() => {}}
                            onEdit={() => {}}
                            onDelete={() => {}}
                            isRunningAll={false}
                            readOnly={true}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Execution History</h2>
                    <p className="text-muted-foreground text-sm">View past runs and results</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
                    <RotateCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>
            
            {loading && history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                    <RotateCw className="w-8 h-8 animate-spin opacity-20" />
                    <p>Loading history...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                    <History className="w-10 h-10 mb-3 opacity-20" />
                    <p className="font-medium">No execution history found</p>
                    <p className="text-sm opacity-70">Run the SOP to see results here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map((exec) => (
                        <Card 
                            key={exec.id}
                            className="hover:bg-muted/40 cursor-pointer transition-all hover:shadow-sm group"
                            onClick={() => handleExecutionClick(exec.id)}
                        >
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-opacity-20 ${
                                        exec.status === 'COMPLETED' ? 'bg-green-500 ring-green-500' : 
                                        exec.status === 'RUNNING' ? 'bg-blue-500 ring-blue-500' : 'bg-red-500 ring-red-500'
                                    }`} />
                                    <div>
                                        <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                            {format(new Date(exec.createdAt), 'PPP p')}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className={`uppercase font-semibold tracking-wider text-[10px] ${
                                                exec.status === 'COMPLETED' ? 'text-green-600' : 
                                                exec.status === 'RUNNING' ? 'text-blue-600' : 'text-red-600'
                                            }`}>
                                                {exec.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
