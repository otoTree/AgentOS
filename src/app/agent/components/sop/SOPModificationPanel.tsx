import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';

interface SOPModificationPanelProps {
    modificationRequest: string;
    setModificationRequest: (req: string) => void;
    isModifying: boolean;
    onModify: () => void;
}

export function SOPModificationPanel({
    modificationRequest,
    setModificationRequest,
    isModifying,
    onModify
}: SOPModificationPanelProps) {
    return (
        <div className="w-80 flex flex-col bg-background border-l h-full">
            <div className="p-4 border-b shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Modify Plan
                </h3>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Need changes? Describe what you want to change, and the agent will update the plan accordingly.
                        </p>
                        <Textarea 
                            placeholder="e.g. Add a step to email the results..." 
                            className="min-h-[120px] text-sm resize-none"
                            value={modificationRequest}
                            onChange={e => setModificationRequest(e.target.value)}
                        />
                    </div>
                    <Button 
                        className="w-full"
                        onClick={onModify}
                        disabled={isModifying || !modificationRequest.trim()}
                        size="sm"
                    >
                        {isModifying ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Plan"
                        )}
                    </Button>
                </div>
                
                <div className="mt-6 p-3 bg-muted/50 rounded-md border border-muted text-xs text-muted-foreground">
                    <p className="font-medium mb-1 text-foreground">Tip</p>
                    <p>You can modify the plan at any time. The agent will preserve completed steps and adjust the remaining workflow.</p>
                </div>
            </div>
        </div>
    );
}
