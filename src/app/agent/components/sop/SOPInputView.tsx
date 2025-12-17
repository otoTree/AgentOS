import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2 } from 'lucide-react';

interface SOPInputViewProps {
    goal: string;
    setGoal: (goal: string) => void;
    isGenerating: boolean;
    onGenerate: () => void;
}

export function SOPInputView({
    goal,
    setGoal,
    isGenerating,
    onGenerate
}: SOPInputViewProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-4 max-w-2xl mx-auto mt-10">
                <div className="space-y-2">
                    <label className="text-sm font-medium">What would you like to achieve?</label>
                    <Textarea 
                        placeholder="e.g. Research the top 5 CRM tools for small business and create a comparison table..." 
                        className="min-h-[120px] text-base"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                    />
                </div>
                <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={onGenerate} 
                    disabled={isGenerating || !goal.trim()}
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                    Generate Plan
                </Button>
            </div>
        </div>
    );
}
