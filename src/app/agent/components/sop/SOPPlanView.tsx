import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Rocket, LayoutList, History } from 'lucide-react';
import { SOPSequence, SOPStep, StepStatus } from '@/lib/ai/sop-types';
import { SOPStepItem } from './SOPStepItem';
import { SOPModificationPanel } from './SOPModificationPanel';
import { SOPHistoryView } from './SOPHistoryView';

interface SOPPlanViewProps {
    sequence: SOPSequence;
    currentSopId: string | null;
    status: StepStatus;
    stepOutputs: Record<string, string>;
    expandedSteps: Record<string, boolean>;
    isRunningAll: boolean;
    isDeployed: boolean;
    onRunAll: () => void;
    onDeploy: () => void;
    onExecuteStep: (step: SOPStep) => void;
    onDeleteStep: (id: string) => void;
    onEditStep: (step: SOPStep) => void;
    onToggleExpand: (id: string) => void;
    
    // Modification props
    modificationRequest: string;
    setModificationRequest: (req: string) => void;
    isModifying: boolean;
    onModify: () => void;
}

export function SOPPlanView({
    sequence,
    currentSopId,
    status,
    stepOutputs,
    expandedSteps,
    isRunningAll,
    isDeployed,
    onRunAll,
    onDeploy,
    onExecuteStep,
    onDeleteStep,
    onEditStep,
    onToggleExpand,
    modificationRequest,
    setModificationRequest,
    isModifying,
    onModify
}: SOPPlanViewProps) {
    const [activeTab, setActiveTab] = useState<'plan' | 'history'>('plan');

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Plan & Steps */}
            <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
                {/* Tabs Header */}
                <div className="flex items-center justify-between border-b px-4 h-12 bg-background shrink-0">
                    <div className="flex items-center gap-1">
                        <Button 
                            variant={activeTab === 'plan' ? 'secondary' : 'ghost'} 
                            size="sm"
                            onClick={() => setActiveTab('plan')}
                            className={`h-8 text-xs font-medium ${activeTab === 'plan' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}
                        >
                            <LayoutList className="w-3.5 h-3.5 mr-1.5" />
                            Plan
                        </Button>
                        <Button 
                            variant={activeTab === 'history' ? 'secondary' : 'ghost'} 
                            size="sm"
                            onClick={() => setActiveTab('history')}
                            disabled={!currentSopId}
                            className={`h-8 text-xs font-medium ${activeTab === 'history' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'}`}
                        >
                            <History className="w-3.5 h-3.5 mr-1.5" />
                            History
                        </Button>
                    </div>
                </div>

                {activeTab === 'plan' ? (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Header Section */}
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight">{sequence.title}</h2>
                                <p className="text-muted-foreground text-base leading-relaxed">{sequence.description}</p>
                            </div>

                            {/* Steps List */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Execution Plan</h3>
                                    <div className="text-xs text-muted-foreground">
                                        {sequence.steps.length} Steps
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {sequence.steps.map((step, index) => {
                                        const stepStatus = status[step.id] || 'pending';
                                        return (
                                            <SOPStepItem 
                                                key={step.id}
                                                step={step}
                                                index={index}
                                                status={stepStatus}
                                                output={stepOutputs[step.id]}
                                                isExpanded={expandedSteps[step.id]}
                                                onToggleExpand={onToggleExpand}
                                                onExecute={onExecuteStep}
                                                onEdit={onEditStep}
                                                onDelete={onDeleteStep}
                                                isRunningAll={isRunningAll}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <SOPHistoryView currentSopId={currentSopId!} sequence={sequence} />
                )}
            </div>

            {/* Vertical Divider */}
            <div className="w-px bg-border shadow-sm" />

            {/* Right Column: Modification Section */}
            <SOPModificationPanel 
                modificationRequest={modificationRequest}
                setModificationRequest={setModificationRequest}
                isModifying={isModifying}
                onModify={onModify}
            />
        </div>
    );
}
