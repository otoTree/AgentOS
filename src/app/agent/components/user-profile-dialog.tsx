'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Copy, RefreshCw, Loader2 } from "lucide-react"; 
import { updateUserProfile, uploadAvatar, getApiToken, generateApiToken } from "../user-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: any; 
}

export function UserProfileDialog({ open, onOpenChange, user }: UserProfileDialogProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'api'>('profile');
    const [username, setUsername] = useState(user?.username || '');
    const [name, setName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.image);
    const [isUploading, setIsUploading] = useState(false);
    
    const [apiToken, setApiToken] = useState<string | null>(null);
    const [isLoadingToken, setIsLoadingToken] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        if (open) {
            setUsername(user?.username || '');
            setName(user?.name || '');
            setAvatarUrl(user?.image);
        }
    }, [open, user]);

    useEffect(() => {
        if (activeTab === 'api' && open) {
            fetchToken();
        }
    }, [activeTab, open]);

    const fetchToken = async () => {
        setIsLoadingToken(true);
        try {
            const token = await getApiToken();
            setApiToken(token || null);
        } catch (error) {
            toast.error("Failed to fetch API token");
        } finally {
            setIsLoadingToken(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await updateUserProfile({ username, name });
            toast.success("Profile updated");
            router.refresh();
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to update profile");
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        try {
            await uploadAvatar(formData);
            toast.success("Avatar uploaded");
            router.refresh();
        } catch (error) {
            toast.error("Failed to upload avatar");
        } finally {
            setIsUploading(false);
        }
    };

    const handleGenerateToken = async () => {
        if (apiToken && !confirm("Generate new token? The old one will be invalid.")) return;
        
        try {
            const newToken = await generateApiToken();
            setApiToken(newToken);
            toast.success("New API Token generated");
        } catch (error) {
            toast.error("Failed to generate token");
        }
    };

    const copyToken = () => {
        if (apiToken) {
            navigator.clipboard.writeText(apiToken);
            toast.success("Token copied to clipboard");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-white border-black/5">
                <div className="p-6 border-b border-black/5 bg-black/[0.02]">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Settings</DialogTitle>
                        <DialogDescription>Manage your profile and API access</DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex border-b border-black/5">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'profile' 
                                ? 'bg-white text-black border-b-2 border-black' 
                                : 'bg-black/[0.02] text-black/40 hover:text-black/60 hover:bg-black/[0.04]'
                        }`}
                    >
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'api' 
                                ? 'bg-white text-black border-b-2 border-black' 
                                : 'bg-black/[0.02] text-black/40 hover:text-black/60 hover:bg-black/[0.04]'
                        }`}
                    >
                        API Access
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'profile' ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="relative h-16 w-16 rounded-full overflow-hidden bg-black/5 flex items-center justify-center border border-black/10">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-8 w-8 text-black/20" />
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm">
                                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="avatar-upload" className="cursor-pointer inline-flex h-9 items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-black/5 hover:text-black">
                                        Change Avatar
                                    </Label>
                                    <Input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                        disabled={isUploading}
                                    />
                                    <p className="text-[10px] text-black/40 mt-2">
                                        Recommended: Square JPG, PNG. Max 2MB.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveProfile} className="w-full rounded-full">
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Your API token allows external applications to access AgentOS on your behalf. 
                                    Keep it secure.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>API Token</Label>
                                {isLoadingToken ? (
                                    <div className="h-10 w-full rounded-md bg-black/5 animate-pulse" />
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            value={apiToken || ''}
                                            readOnly
                                            placeholder="No token generated"
                                            className="font-mono text-xs bg-black/[0.02]"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={copyToken}
                                            disabled={!apiToken}
                                            className="shrink-0"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <Button 
                                onClick={handleGenerateToken} 
                                variant="outline" 
                                className="w-full gap-2 rounded-full border-black/10 hover:bg-black/5"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Generate New Token
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
