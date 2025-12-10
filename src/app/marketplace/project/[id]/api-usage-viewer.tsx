'use client';

import { useState, useEffect } from "react";
import { Clipboard } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function ApiUsageViewer({ deploymentId, inputs }: { deploymentId: string, inputs: any[] }) {
    const [origin, setOrigin] = useState("");

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const generateCurl = () => {
        const url = `${origin}/api/run/${deploymentId}`;
        const data: Record<string, any> = {};
        inputs.forEach(input => {
            let val = input.defaultValue;
            if (val === undefined || val === '') {
                if (input.type === 'number') val = 0;
                else if (input.type === 'boolean') val = false;
                else val = "value";
            }
            data[input.name] = val;
        });
        
        return `curl -X POST "${url}" \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(data)}'`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateCurl());
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="relative group">
            <pre className="bg-muted/50 p-3 rounded-lg text-[10px] font-mono overflow-x-auto border whitespace-pre-wrap break-all">
                {generateCurl()}
            </pre>
            <button 
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-1.5 rounded bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-muted"
                title="Copy"
            >
                <Clipboard className="w-3 h-3" />
            </button>
        </div>
    );
}