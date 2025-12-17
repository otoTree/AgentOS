import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ChevronDown, ChevronRight, Edit, Trash2, Play } from 'lucide-react';
import { SOPStep } from '@/lib/ai/sop-types';

interface SOPStepItemProps {
    step: SOPStep;
    index: number;
    status: 'pending' | 'running' | 'completed';
    output?: string;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onExecute: (step: SOPStep) => void;
    onEdit: (step: SOPStep) => void;
    onDelete: (id: string) => void;
    isRunningAll: boolean;
    readOnly?: boolean;
}

export function SOPStepItem({
    step,
    index,
    status,
    output,
    isExpanded,
    onToggleExpand,
    onExecute,
    onEdit,
    onDelete,
    isRunningAll,
    readOnly = false
}: SOPStepItemProps) {
    const isRunning = status === 'running';
    const isCompleted = status === 'completed';

    return (
        <div 
            className={`
                border rounded-lg p-4 transition-all
                ${isRunning ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'bg-card'}
                ${isCompleted ? 'bg-muted/30 border-muted' : ''}
            `}
        >
            <div className="flex items-start gap-4">
                <div className="mt-1">
                    {isRunning ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                            {index + 1}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${isCompleted ? 'text-muted-foreground' : ''}`}>
                            {step.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            {step.tool && (
                                <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground uppercase tracking-wider">
                                    {step.tool}
                                </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleExpand(step.id)}>
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    
                    {/* Prompt Preview */}
                    {isExpanded && (
                        <div className="mt-2 space-y-2">
                            <div className="text-xs font-medium text-muted-foreground">Prompt:</div>
                            <div className="text-xs bg-muted/50 p-2 rounded text-muted-foreground font-mono whitespace-pre-wrap">
                                {step.prompt}
                            </div>
                            
                            {output && (
                                <>
                                    <div className="text-xs font-medium text-muted-foreground mt-2">Output:</div>
                                    <div className="text-sm bg-background border p-3 rounded-md shadow-sm whitespace-pre-wrap">
                                        {output}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <div className="flex items-center gap-2">
                        {!isRunning && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(step)}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onDelete(step.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                        {!isCompleted && !isRunning && (
                            <Button size="sm" onClick={() => onExecute(step)} disabled={isRunningAll}>
                                <Play className="w-3 h-3 mr-2" />
                                Run
                            </Button>
                        )}
                        {isRunning && (
                            <Button size="sm" disabled variant="secondary">
                                Running...
                            </Button>
                        )}
                        {isCompleted && (
                            <Button size="sm" variant="ghost" onClick={() => onExecute(step)} disabled={isRunningAll}>
                                Rerun
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
