import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, ChevronDown, ChevronRight, Edit, Trash2, Play, Circle } from 'lucide-react';
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
        <Card 
            className={`
                transition-all duration-200 border
                ${isRunning ? 'border-primary ring-1 ring-primary/20 bg-primary/5 shadow-md' : 'hover:border-primary/50 hover:shadow-sm'}
                ${isCompleted ? 'bg-muted/10 border-muted' : ''}
            `}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="mt-1 shrink-0">
                        {isRunning ? (
                            <div className="relative">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center text-xs font-medium text-muted-foreground bg-background">
                                {index + 1}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                        {/* Header Row */}
                        <div className="flex items-center justify-between gap-2">
                            <h3 className={`font-semibold truncate ${isCompleted ? 'text-muted-foreground line-through decoration-muted-foreground/50' : ''}`}>
                                {step.name}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                                {step.tool && (
                                    <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground uppercase tracking-wider font-medium border">
                                        {step.tool}
                                    </span>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 w-7 p-0" 
                                    onClick={() => onToggleExpand(step.id)}
                                >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <p className={`text-sm ${isCompleted ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {step.description}
                        </p>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1.5">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt</div>
                                    <div className="text-xs bg-muted/50 p-3 rounded-md text-muted-foreground font-mono whitespace-pre-wrap border border-muted/50">
                                        {step.prompt}
                                    </div>
                                </div>
                                
                                {output && (
                                    <div className="space-y-1.5">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output</div>
                                        <div className="text-sm bg-background border p-4 rounded-md shadow-sm whitespace-pre-wrap font-mono text-foreground/90 max-h-[300px] overflow-y-auto">
                                            {output}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions Toolbar */}
                        {!readOnly && (
                            <div className={`
                                flex items-center gap-2 pt-2 mt-2 border-t border-transparent
                                ${isExpanded ? 'border-border' : ''}
                            `}>
                                {!isRunning && (
                                    <>
                                        {!isCompleted && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => onExecute(step)} 
                                                disabled={isRunningAll}
                                                className="h-8 text-xs"
                                            >
                                                <Play className="w-3 h-3 mr-1.5" />
                                                Run Step
                                            </Button>
                                        )}
                                        {isCompleted && (
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => onExecute(step)} 
                                                disabled={isRunningAll}
                                                className="h-8 text-xs"
                                            >
                                                <Play className="w-3 h-3 mr-1.5" />
                                                Rerun
                                            </Button>
                                        )}
                                        
                                        <div className="flex-1" /> {/* Spacer */}

                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 px-2 text-muted-foreground hover:text-foreground" 
                                            onClick={() => onEdit(step)}
                                        >
                                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                                            Edit
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 px-2 text-muted-foreground hover:text-destructive" 
                                            onClick={() => onDelete(step.id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                            Delete
                                        </Button>
                                    </>
                                )}
                                {isRunning && (
                                    <div className="text-xs text-primary font-medium flex items-center animate-pulse">
                                        Executing step...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
