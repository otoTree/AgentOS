import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SOPDeployDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentSopId: string | null;
    isDeployed: boolean;
    onToggleDeploy: () => void;
    onSave: () => void;
}

export function SOPDeployDialog({
    open,
    onOpenChange,
    currentSopId,
    isDeployed,
    onToggleDeploy,
    onSave
}: SOPDeployDialogProps) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const handleCopyEndpoint = () => {
        navigator.clipboard.writeText(`${origin}/api/sop/${currentSopId}/run`);
        toast.success("Copied to clipboard");
    };

    const handleCopyCurl = () => {
        const code = `curl -X POST ${origin}/api/sop/${currentSopId}/run \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inputs": {
      "key": "value"
    }
  }'`;
        navigator.clipboard.writeText(code);
        toast.success("Copied to clipboard");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Deploy as API</DialogTitle>
                    <DialogDescription>
                        Run this SOP remotely via API.
                    </DialogDescription>
                </DialogHeader>

                {!currentSopId ? (
                    <div className="py-4 text-center">
                        <p className="text-muted-foreground mb-4">Please save the SOP first to generate a deployment ID.</p>
                        <Button onClick={() => { onOpenChange(false); onSave(); }}>
                            Save SOP
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                            <div>
                                <h4 className="font-medium text-sm">Deployment Status</h4>
                                <p className="text-xs text-muted-foreground">
                                    {isDeployed ? "SOP is deployed and accessible via API." : "SOP is not deployed. API access is disabled."}
                                </p>
                            </div>
                            <Button 
                                variant={isDeployed ? "destructive" : "default"} 
                                size="sm"
                                onClick={onToggleDeploy}
                            >
                                {isDeployed ? "Undeploy" : "Deploy"}
                            </Button>
                        </div>

                        {isDeployed && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">API Endpoint</label>
                                    <div className="flex gap-2">
                                        <Input 
                                            readOnly 
                                            value={`${origin}/api/sop/${currentSopId}/run`} 
                                            className="font-mono text-xs"
                                        />
                                        <Button 
                                            variant="outline" 
                                            size="icon"
                                            onClick={handleCopyEndpoint}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Example cURL Request</label>
                                    <div className="relative">
                                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs font-mono">
{`curl -X POST ${origin}/api/sop/${currentSopId}/run \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inputs": {
      "key": "value"
    }
  }'`}
                                        </pre>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6"
                                            onClick={handleCopyCurl}
                                        >
                                            <Copy className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                    <p>Note: Replace <code>&lt;YOUR_API_TOKEN&gt;</code> with your actual API token found in User Settings.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
