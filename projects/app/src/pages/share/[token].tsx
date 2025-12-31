import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@agentos/web/components/ui/button';
import { Input } from '@agentos/web/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@agentos/web/components/ui/card';
import { FileIcon, Lock, Download, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type ShareInfo = {
    fileName: string;
    fileSize: number;
    creator: {
        name: string;
    };
    createdAt: string;
    isPasswordProtected: boolean;
}

export default function SharePage() {
    const router = useRouter();
    const { token } = router.query;
    const [info, setInfo] = useState<ShareInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        fetch(`/api/share/${token}`)
            .then(res => {
                if (!res.ok) throw new Error('Share link not found or expired');
                return res.json();
            })
            .then(data => setInfo(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [token]);

    const handleDownload = async () => {
        if (!info) return;
        
        if (info.isPasswordProtected && !password) {
            setError('Password is required');
            return;
        }
        
        setDownloading(true);
        setError('');

        try {
            // If public, we can just redirect or fetch URL
            // If protected, we POST password to get URL
            
            const res = await fetch(`/api/share/${token}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                const data = await res.json();
                window.location.href = data.url;
            } else {
                const err = await res.json();
                setError(err.error || 'Download failed');
            }
        } catch {
            setError('Download failed');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    if (error && !info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <CardTitle>Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <FileIcon className="w-8 h-8 text-blue-500" />
                    </div>
                    <CardTitle className="break-all">{info.fileName}</CardTitle>
                    <CardDescription>
                        Shared by {info.creator?.name} • {format(new Date(info.createdAt), 'MMM d, yyyy')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-100 p-4 rounded-lg flex justify-between text-sm">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-medium">{(info.fileSize / 1024).toFixed(1)} KB</span>
                    </div>

                    {info.isPasswordProtected && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Lock className="w-4 h-4" /> Password Protected
                            </div>
                            <Input 
                                type="password" 
                                placeholder="Enter password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                            />
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleDownload} disabled={downloading}>
                        {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
