'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { generateSopSequence } from '@/lib/ai/ai-sop';
import { modifySop } from '../sop-actions';
import { SOPSequence, SOPStep, SavedSop, StepStatus } from '@/lib/ai/sop-types';
import { startSopExecution, executeSopStep } from '../sop-execution-actions';
import { useChatStore } from '../store/useChatStore';

// Components
import { SOPSidebar } from './sop/SOPSidebar';
import { SOPHeader } from './sop/SOPHeader';
import { SOPInputView } from './sop/SOPInputView';
import { SOPPlanView } from './sop/SOPPlanView';
import { SOPDeployDialog } from './sop/SOPDeployDialog';
import { SOPEditStepDialog } from './sop/SOPEditStepDialog';

export default function SOPAgentWindow() {
    const [goal, setGoal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [sequence, setSequence] = useState<SOPSequence | null>(null);
    const [status, setStatus] = useState<StepStatus>({});
    const [isMounted, setIsMounted] = useState(false);
    
    // CRUD State
    const [savedSops, setSavedSops] = useState<SavedSop[]>([]);
    const [currentSopId, setCurrentSopId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoadingSops, setIsLoadingSops] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunningAll, setIsRunningAll] = useState(false);
    const [isDeployOpen, setIsDeployOpen] = useState(false);
    const [isDeployed, setIsDeployed] = useState(false);
    
    // Independent Execution State
    const [executionId, setExecutionId] = useState<string | null>(null);
    const [stepOutputs, setStepOutputs] = useState<Record<string, string>>({});
    const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

    const isRunningAllRef = useRef(false);
    
    // const params = useParams();
    // const conversationId = params?.id as string; // Removed
    const { activeBrowserSessionId } = useChatStore();
    
    const [executingStepId, setExecutingStepId] = useState<string | null>(null);

    const [modificationRequest, setModificationRequest] = useState('');
    const [isModifying, setIsModifying] = useState(false);
    
    const [editingStep, setEditingStep] = useState<SOPStep | null>(null);

    const handleDeleteStep = (stepId: string) => {
        if (!sequence) return;
        const newSteps = sequence.steps.filter(s => s.id !== stepId);
        setSequence({
            ...sequence,
            steps: newSteps
        });
        toast.success("Step deleted");
    };

    const handleUpdateStep = (step: SOPStep) => {
        if (!sequence) return;
        const newSteps = sequence.steps.map(s => 
            s.id === step.id ? step : s
        );
        setSequence({
            ...sequence,
            steps: newSteps
        });
        setEditingStep(null);
        toast.success("Step updated");
    };

    useEffect(() => {
        setIsMounted(true);
        loadSops();
    }, []);

    const loadSops = async () => {
        setIsLoadingSops(true);
        try {
            const res = await fetch('/api/sop');
            if (res.ok) {
                const data = await res.json();
                setSavedSops(data);
            }
        } catch (e) {
            console.error("Failed to load SOPs", e);
        } finally {
            setIsLoadingSops(false);
        }
    };

    const handleSave = async () => {
        if (!sequence) return;
        setIsSaving(true);
        try {
            const payload = {
                name: sequence.title,
                description: sequence.description,
                graph: sequence,
                deployed: isDeployed
            };

            let res;
            if (currentSopId) {
                res = await fetch(`/api/sop/${currentSopId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/sop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                const saved = await res.json();
                setCurrentSopId(saved.id);
                toast.success("SOP Saved");
                loadSops();
            } else {
                toast.error("Failed to save SOP");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error saving SOP");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this SOP?")) return;
        
        try {
            const res = await fetch(`/api/sop/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("SOP Deleted");
                if (currentSopId === id) {
                    handleNew();
                }
                loadSops();
            }
        } catch (e) {
            toast.error("Failed to delete SOP");
        }
    };

    const handleLoad = (sop: SavedSop) => {
        setSequence(sop.graph);
        setCurrentSopId(sop.id);
        setGoal(sop.description || '');
        setStatus({}); // Reset execution status
        setIsDeployed(sop.deployed);
        setStepOutputs({});
        setExecutionId(null);
    };

    const handleNew = () => {
        setSequence(null);
        setCurrentSopId(null);
        setGoal('');
        setStatus({});
        setIsDeployed(false);
        setStepOutputs({});
        setExecutionId(null);
    };

    // Removed the Effect that watched isLoading

    const handleRunAll = async () => {
        if (!sequence?.steps.length) return;
        setIsRunningAll(true);
        isRunningAllRef.current = true;
        
        try {
            // Ensure Execution ID first
            let currentExecId = executionId;
            if (!currentExecId) {
                const exec = await startSopExecution(currentSopId || undefined, sequence.title);
                currentExecId = exec.id;
                setExecutionId(currentExecId);
            }

            // Find first pending step
            const startIndex = sequence.steps.findIndex(s => status[s.id] !== 'completed');
            const stepsToRun = startIndex === -1 ? sequence.steps : sequence.steps.slice(startIndex);

            for (const step of stepsToRun) {
                if (!isRunningAllRef.current) break; // User stopped?

                await executeStepInternal(step, currentExecId!);
                
                // Small delay for UI
                await new Promise(r => setTimeout(r, 500));
            }

            if (isRunningAllRef.current) {
                toast.success("All steps completed");
            }
        } catch (e) {
            console.error(e);
            toast.error("Execution failed");
        } finally {
            setIsRunningAll(false);
            isRunningAllRef.current = false;
        }
    };

    const executeStep = async (step: SOPStep) => {
        // Standalone run
        try {
            let currentExecId = executionId;
            if (!currentExecId) {
                const exec = await startSopExecution(currentSopId || undefined, sequence?.title);
                currentExecId = exec.id;
                setExecutionId(currentExecId);
            }
            await executeStepInternal(step, currentExecId!);
        } catch (e) {
            console.error(e);
            toast.error("Failed to start execution");
        }
    };

    const executeStepInternal = async (step: SOPStep, execId: string) => {
        setStatus(prev => ({ ...prev, [step.id]: 'running' }));
        setExecutingStepId(step.id);
        
        try {
            const result = await executeSopStep(execId, step);
            
            setStepOutputs(prev => ({
                ...prev,
                [step.id]: result.output
            }));
            setStatus(prev => ({ ...prev, [step.id]: 'completed' }));
            // Auto expand to show result
            setExpandedSteps(prev => ({ ...prev, [step.id]: true }));

        } catch (e: any) {
            console.error(e);
            setStatus(prev => ({ ...prev, [step.id]: 'pending' })); 
            toast.error(`Step ${step.name} failed: ${e.message}`);
            throw e; // Propagate to handleRunAll
        } finally {
            setExecutingStepId(null);
        }
    };

    const handleGenerate = async () => {
        if (!goal.trim()) return;
        
        setIsGenerating(true);
        try {
            const result = await generateSopSequence(goal);
            setSequence(result);
            // Reset status
            const newStatus: StepStatus = {};
            result.steps.forEach(s => newStatus[s.id] = 'pending');
            setStatus(newStatus);
            setStepOutputs({});
            setExecutionId(null);
            toast.success("SOP Generated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate SOP");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleModify = async () => {
        if (!modificationRequest.trim() || !sequence) return;
        setIsModifying(true);
        try {
            const result = await modifySop(sequence, modificationRequest);
            setSequence(result);
            const newStatus: StepStatus = {};
            result.steps.forEach(s => {
                if (status[s.id]) newStatus[s.id] = status[s.id];
                else newStatus[s.id] = 'pending';
            });
            setStatus(newStatus);

            toast.success("SOP Modified");
            setModificationRequest('');
        } catch (e) {
            console.error(e);
            toast.error("Failed to modify SOP");
        } finally {
            setIsModifying(false);
        }
    };

    const toggleDeploy = async () => {
        if (!currentSopId || !sequence) {
            toast.error("Please save the SOP first");
            return;
        }

        const newStatus = !isDeployed;
        // Optimistic update
        setIsDeployed(newStatus);
        
        try {
            const payload = {
                name: sequence.title,
                description: sequence.description,
                graph: sequence,
                deployed: newStatus
            };
            
            const res = await fetch(`/api/sop/${currentSopId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                toast.success(newStatus ? "SOP Deployed" : "SOP Undeployed");
                loadSops();
            } else {
                setIsDeployed(!newStatus); // Revert
                toast.error("Failed to update status");
            }
        } catch (e) {
            console.error(e);
            setIsDeployed(!newStatus); // Revert
            toast.error("Error updating status");
        }
    };

    const toggleExpand = (stepId: string) => {
        setExpandedSteps(prev => ({ ...prev, [stepId]: !prev[stepId] }));
    };

    if (!isMounted) return <div className="p-8 flex justify-center text-muted-foreground">Loading...</div>;

    return (
        <div className="flex h-full bg-background overflow-hidden absolute inset-0 z-50">
            <SOPSidebar 
                isOpen={isSidebarOpen}
                savedSops={savedSops}
                currentSopId={currentSopId}
                isLoading={isLoadingSops}
                onLoad={handleLoad}
                onNew={handleNew}
                onDelete={handleDelete}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <SOPHeader 
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    sequence={sequence}
                    isSaving={isSaving}
                    onSave={handleSave}
                    isRunningAll={isRunningAll}
                    onRunAll={handleRunAll}
                    isDeployed={isDeployed}
                    onDeployOpen={() => setIsDeployOpen(true)}
                />

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0">
                    {!sequence ? (
                        <SOPInputView 
                            goal={goal}
                            setGoal={setGoal}
                            isGenerating={isGenerating}
                            onGenerate={handleGenerate}
                        />
                    ) : (
                        <SOPPlanView 
                            sequence={sequence}
                            status={status}
                            stepOutputs={stepOutputs}
                            expandedSteps={expandedSteps}
                            isRunningAll={isRunningAll}
                            isDeployed={isDeployed}
                            onRunAll={handleRunAll}
                            onDeploy={() => setIsDeployOpen(true)}
                            onExecuteStep={executeStep}
                            onDeleteStep={handleDeleteStep}
                            onEditStep={setEditingStep}
                            onToggleExpand={toggleExpand}
                            modificationRequest={modificationRequest}
                            setModificationRequest={setModificationRequest}
                            isModifying={isModifying}
                            onModify={handleModify}
                        />
                    )}
                </div>
            </div>

            <SOPDeployDialog 
                open={isDeployOpen}
                onOpenChange={setIsDeployOpen}
                currentSopId={currentSopId}
                isDeployed={isDeployed}
                onToggleDeploy={toggleDeploy}
                onSave={handleSave}
            />

            <SOPEditStepDialog 
                editingStep={editingStep}
                setEditingStep={setEditingStep}
                onClose={() => setEditingStep(null)}
                onUpdate={handleUpdateStep}
            />
        </div>
    );
}
