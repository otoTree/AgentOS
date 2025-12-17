import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Rocket } from 'lucide-react';
import { SOPSequence, SOPStep, StepStatus } from '@/lib/ai/sop-types';
import { SOPStepItem } from './SOPStepItem';
import { SOPModificationPanel } from './SOPModificationPanel';

interface SOPPlanViewProps {
    sequence: SOPSequence;
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
    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Plan & Steps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Plan Header */}
                <div className="flex items-start justify-between border-b pb-4">
                    <div>
                        <h2 className="text-lg font-semibold">{sequence.title}</h2>
                        <p className="text-muted-foreground text-sm">{sequence.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={onRunAll} disabled={isRunningAll}>
                            {isRunningAll ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
                            Run
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onDeploy}>
                            <Rocket className={`w-3 h-3 mr-2 ${isDeployed ? 'text-green-500' : ''}`} />
                            Deploy
                        </Button>
                    </div>
                </div>

                {/* Steps List */}
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

            {/* Vertical Divider */}
            <div className="w-[1px] bg-border" />

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
