import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { SOPStep } from '@/lib/ai/sop-types';

interface SOPEditStepDialogProps {
    editingStep: SOPStep | null;
    onClose: () => void;
    onUpdate: (step: SOPStep) => void;
    setEditingStep: (step: SOPStep) => void;
}

export function SOPEditStepDialog({
    editingStep,
    onClose,
    onUpdate,
    setEditingStep
}: SOPEditStepDialogProps) {
    return (
        <Dialog open={!!editingStep} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Step</DialogTitle>
                </DialogHeader>
                {editingStep && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input 
                                value={editingStep.name} 
                                onChange={e => setEditingStep({...editingStep, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input 
                                value={editingStep.description} 
                                onChange={e => setEditingStep({...editingStep, description: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tool (Optional)</label>
                            <Input 
                                value={editingStep.tool || ''} 
                                onChange={e => setEditingStep({...editingStep, tool: e.target.value})}
                                placeholder="e.g. browser_search"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Dependencies (Optional)</label>
                            <Input 
                                value={editingStep.dependencies?.join(', ') || ''} 
                                onChange={e => {
                                    const val = e.target.value;
                                    const deps = val ? val.split(',').map(s => s.trim()).filter(s => s) : undefined;
                                    setEditingStep({...editingStep, dependencies: deps});
                                }}
                                placeholder="e.g. step_1, step_2"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Prompt</label>
                            <Textarea 
                                value={editingStep.prompt} 
                                onChange={e => setEditingStep({...editingStep, prompt: e.target.value})}
                                className="min-h-[150px] font-mono text-xs"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={() => onUpdate(editingStep)}>Save Changes</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
