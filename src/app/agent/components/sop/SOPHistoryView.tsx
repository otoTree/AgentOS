import React, { useEffect, useState } from 'react';
import { getSopExecutions, getSopExecution } from '../../sop-execution-actions';
import { SOPSequence, StepStatus } from '@/lib/ai/sop-types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { SOPStepItem } from './SOPStepItem';
import { format } from 'date-fns';

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
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="flex items-center gap-2 border-b pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedExecution(null)}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h2 className="font-semibold">Execution Details</h2>
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(selectedExecution.createdAt), 'PPpp')}
                        </p>
                    </div>
                </div>

                {/* Deliverables */}
                {deliverables && Object.keys(deliverables).length > 0 && (
                     <div className="bg-muted/20 p-4 rounded-lg border">
                        <h3 className="font-medium mb-2">Deliverables</h3>
                        <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-40 whitespace-pre-wrap">
                            {JSON.stringify(deliverables, null, 2)}
                        </pre>
                     </div>
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
        <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Execution History</h2>
                <Button variant="ghost" size="sm" onClick={loadHistory}>
                    Refresh
                </Button>
            </div>
            
            {loading && history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No execution history found.</div>
            ) : (
                <div className="space-y-2">
                    {history.map((exec) => (
                        <div 
                            key={exec.id}
                            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                            onClick={() => handleExecutionClick(exec.id)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                    exec.status === 'COMPLETED' ? 'bg-green-500' : 
                                    exec.status === 'RUNNING' ? 'bg-blue-500' : 'bg-red-500'
                                }`} />
                                <div>
                                    <div className="font-medium text-sm">
                                        {format(new Date(exec.createdAt), 'PPP p')}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {exec.status}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
