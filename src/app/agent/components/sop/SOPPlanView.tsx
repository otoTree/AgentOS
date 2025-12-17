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
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs Header */}
                <div className="flex items-center justify-between border-b p-2 px-4 bg-muted/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Button 
                            variant={activeTab === 'plan' ? 'secondary' : 'ghost'} 
                            size="sm"
                            onClick={() => setActiveTab('plan')}
                            className="h-8"
                        >
                            <LayoutList className="w-4 h-4 mr-2" />
                            Plan
                        </Button>
                        <Button 
                            variant={activeTab === 'history' ? 'secondary' : 'ghost'} 
                            size="sm"
                            onClick={() => setActiveTab('history')}
                            disabled={!currentSopId}
                            className="h-8"
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                    </div>

                    {activeTab === 'plan' && (
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={onRunAll} disabled={isRunningAll} className="h-8">
                                {isRunningAll ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
                                Run
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onDeploy} className="h-8">
                                <Rocket className={`w-3 h-3 mr-2 ${isDeployed ? 'text-green-500' : ''}`} />
                                Deploy
                            </Button>
                        </div>
                    )}
                </div>

                {activeTab === 'plan' ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">{sequence.title}</h2>
                            <p className="text-muted-foreground text-sm">{sequence.description}</p>
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
                ) : (
                    <SOPHistoryView currentSopId={currentSopId!} sequence={sequence} />
                )}
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
