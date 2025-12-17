import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

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
        <div className="w-80 p-4 bg-muted/5 overflow-y-auto">
            <h3 className="text-sm font-medium mb-4">Modify Plan</h3>
            <div className="flex flex-col gap-2">
                <Textarea 
                    placeholder="e.g. Add a step to email the results..." 
                    className="min-h-[100px] text-sm"
                    value={modificationRequest}
                    onChange={e => setModificationRequest(e.target.value)}
                />
                <Button 
                    className="w-full"
                    onClick={onModify}
                    disabled={isModifying || !modificationRequest.trim()}
                >
                    {isModifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Plan"}
                </Button>
            </div>
            
            <div className="mt-6 text-xs text-muted-foreground">
                <p>You can modify the plan at any time. The agent will adjust the remaining steps.</p>
            </div>
        </div>
    );
}
