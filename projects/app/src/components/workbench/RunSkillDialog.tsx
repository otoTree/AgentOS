import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@agentos/web/components/ui/dialog';
import { Button } from '@agentos/web/components/ui/button';
import { Label } from '@agentos/web/components/ui/label';
import { Switch } from '@agentos/web/components/ui/switch';
import { Loader2, Play, Terminal, Box } from 'lucide-react';
import { AutoForm } from './AutoForm';
import { parsePythonEntrypoint, ParamInfo } from '@/utils/python-parser';
import { toast } from '@agentos/web/components/ui/sonner';

const Editor = dynamic(
    () => import('@/components/ui/code-editor').then((mod) => mod.CodeEditor),
    { ssr: false }
);

type RunSkillDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    skillId: string;
    skillName: string;
    entry?: string;
    initialInput?: string;
    code?: string; // Current editor code if available
    onRun: (input: Record<string, unknown>) => Promise<unknown>;
}

export function RunSkillDialog({
    open,
    onOpenChange,
    skillId,
    skillName,
    entry,
    initialInput,
    code,
    onRun
}: RunSkillDialogProps) {
    const [runInput, setRunInput] = useState(initialInput || '{}');
    const [runResult, setRunResult] = useState<unknown>(null);
    const [running, setRunning] = useState(false);
    const [formMode, setFormMode] = useState(false);
    const [parsedParams, setParsedParams] = useState<ParamInfo[]>([]);
    const [loadingParams, setLoadingParams] = useState(false);

    useEffect(() => {
        if (open) {
            if (code) {
                // Use provided code directly
                const params = parsePythonEntrypoint(code);
                updateParams(params);
            } else if (skillId) {
                // Fetch code from API
                loadParams();
            }
        }
    }, [open, skillId, entry, code]);

    const updateParams = (params: ParamInfo[]) => {
        setParsedParams(params);
        if (params.length > 0) {
            setFormMode(true);
            // Pre-fill defaults if current input is empty or default
            const currentData = (() => {
                try { return JSON.parse(runInput); }
                catch { return {}; }
            })();
            
            const hasData = Object.keys(currentData).length > 0;
            if (!hasData || runInput === '{}') {
                const defaults: Record<string, unknown> = {};
                params.forEach(p => {
                    if (p.default !== undefined) defaults[p.name] = p.default;
                });
                setRunInput(JSON.stringify(defaults, null, 2));
            }
        } else {
            setFormMode(false);
        }
    };

    const loadParams = async () => {
        setLoadingParams(true);
        try {
            let ep = entry;
            if (!ep) {
                const res = await fetch(`/api/workbench/skills/${skillId}`);
                if (res.ok) {
                    const skill = await res.json();
                    ep = skill.meta?.entry;
                }
            }

            if (ep) {
                const res = await fetch(`/api/workbench/skills/${skillId}/files?filename=${encodeURIComponent(ep)}`);
                if (res.ok) {
                    const data = await res.json();
                    const params = parsePythonEntrypoint(data.content);
                    updateParams(params);
                }
            }
        } catch (err) {
            console.error('Failed to load params', err);
        } finally {
            setLoadingParams(false);
        }
    };

    const handleExecute = async () => {
        let inputJson;
        try {
            inputJson = JSON.parse(runInput);
        } catch {
            toast.error('Invalid JSON input');
            return;
        }

        setRunning(true);
        setRunResult(null);
        try {
            const result = await onRun(inputJson);
            setRunResult(result);
            toast.success('Executed successfully');
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Execution failed';
            toast.error(message);
            setRunResult({ error: message });
        } finally {
            setRunning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Play className="w-5 h-5 text-green-600" />
                        Run Skill: {skillName}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> Input
                            </Label>
                            {parsedParams.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground font-normal">Form Mode</Label>
                                    <Switch checked={formMode} onCheckedChange={setFormMode} />
                                </div>
                            )}
                        </div>

                        {loadingParams ? (
                            <div className="h-40 flex items-center justify-center border rounded-md bg-muted/5">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : formMode && parsedParams.length > 0 ? (
                            <div className="border rounded-md p-4 bg-muted/10 max-h-60 overflow-y-auto">
                                <AutoForm 
                                    params={parsedParams}
                                    value={(() => {
                                        try { return JSON.parse(runInput); }
                                        catch { return {}; }
                                    })()}
                                    onChange={(val) => setRunInput(JSON.stringify(val, null, 2))}
                                />
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden h-40">
                                <Editor
                                    height="100%"
                                    defaultLanguage="json"
                                    value={runInput}
                                    onChange={(val) => setRunInput(val || '')}
                                    theme="vs-dark"
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        lineNumbers: 'off',
                                        scrollBeyondLastLine: false,
                                        folding: false,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {runResult && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Box className="w-4 h-4" /> Output
                            </Label>
                            <div className="bg-slate-950 rounded-md p-4 overflow-x-auto">
                                <pre className="text-xs text-slate-100 font-mono">
                                    {JSON.stringify(runResult, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <Button onClick={handleExecute} disabled={running}>
                        {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Execute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
