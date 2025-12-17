import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, Sparkles } from 'lucide-react';

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
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/5">
            <Card className="w-full max-w-2xl shadow-lg border-muted/40">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Create New SOP</CardTitle>
                    <CardDescription className="text-base">
                        Describe your goal, and the agent will generate a step-by-step operating procedure for you.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Textarea 
                            placeholder="e.g. Research the top 5 CRM tools for small business and create a comparison table..." 
                            className="min-h-[150px] text-base resize-none p-4"
                            value={goal}
                            onChange={e => setGoal(e.target.value)}
                        />
                    </div>
                    <Button 
                        className="w-full h-12 text-base font-medium transition-all hover:scale-[1.01]" 
                        size="lg" 
                        onClick={onGenerate} 
                        disabled={isGenerating || !goal.trim()}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Generating Plan...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5 mr-2" />
                                Generate Plan
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
