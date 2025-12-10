'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react"; 
import { updateUserProfile, uploadAvatar, getApiToken, generateApiToken } from "../user-actions";
import { toast } from "sonner";

interface UserProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: any; 
    onUserUpdated: () => void; 
}

export function UserProfileDialog({ isOpen, onClose, user, onUserUpdated }: UserProfileDialogProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'api'>('profile');
    const [username, setUsername] = useState(user?.username || '');
    const [name, setName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.image);
    const [isUploading, setIsUploading] = useState(false);
    
    const [apiToken, setApiToken] = useState<string | null>(null);
    const [isLoadingToken, setIsLoadingToken] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUsername(user?.username || '');
            setName(user?.name || '');
            setAvatarUrl(user?.image);
        }
    }, [isOpen, user]);

    useEffect(() => {
        if (activeTab === 'api' && isOpen) {
            fetchToken();
        }
    }, [activeTab, isOpen]);

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
            onUserUpdated();
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
            onUserUpdated(); 
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>User Settings</DialogTitle>
                </DialogHeader>
                
                <div className="flex gap-4 border-b mb-4">
                    <button 
                        className={`pb-2 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profile
                    </button>
                    <button 
                        className={`pb-2 text-sm font-medium ${activeTab === 'api' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('api')}
                    >
                        API Token
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center border shrink-0">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-muted-foreground" />
                                )}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">Profile Picture</p>
                                <p className="text-xs text-muted-foreground">Click image to upload. Max 5MB.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input 
                                id="username" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="johndoe"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Display Name</Label>
                            <Input 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="John Doe"
                            />
                        </div>
                        
                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleSaveProfile}>Save Changes</Button>
                        </div>
                    </div>
                )}

                {activeTab === 'api' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Your API Token</Label>
                            {isLoadingToken ? (
                                <div className="text-sm text-muted-foreground">Loading...</div>
                            ) : apiToken ? (
                                <div className="relative">
                                    <Input readOnly value={apiToken} className="pr-20 font-mono text-xs" />
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                                        onClick={() => {
                                            navigator.clipboard.writeText(apiToken);
                                            toast.success("Copied!");
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No API token generated yet.</div>
                            )}
                        </div>

                        <div className="pt-2">
                            <Button onClick={handleGenerateToken} variant="outline" className="w-full">
                                {apiToken ? "Regenerate Token" : "Generate Token"}
                            </Button>
                            {apiToken && (
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Warning: Regenerating will invalidate the old token.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
