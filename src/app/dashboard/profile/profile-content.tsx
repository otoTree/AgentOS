'use client';

import { useState } from 'react';
import { generateApiToken, deleteApiToken, addCredits } from '@/app/actions';
import { updateUserProfile, updateUserUsername } from '@/app/dashboard/settings-actions';
import { useRouter } from 'next/navigation';
import { UserConfig } from "@/lib/infra/config";

interface ApiToken {
    id: string;
    name: string;
    token: string;
    createdAt: Date;
    lastUsed: Date | null;
}

interface StorageStats {
    used: number;
    limit: number;
    percentage: number;
}

interface ProfileContentProps {
    initialCredits: number;
    initialTokens: ApiToken[];
    initialName?: string | null;
    initialImage?: string | null;
    initialStorage?: StorageStats;
    initialUsername?: string | null;
    mode?: 'credits-only'; // Only one mode needed now for the credits button
}

export default function ProfileContent({
    initialCredits,
    initialTokens,
    initialName,
    initialImage,
    initialStorage,
    initialUsername,
    mode
}: ProfileContentProps) {
    const router = useRouter();

    // Format bytes helper
    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };
    
    // Tabs: 'profile' | 'tokens'
    const [activeTab, setActiveTab] = useState<'profile' | 'tokens'>('profile');

    // -- Profile State --
    const [displayName, setDisplayName] = useState(initialName || '');
    const [username, setUsername] = useState(initialUsername || '');
    const [avatarUrl, setAvatarUrl] = useState(initialImage || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // -- Token State --
    const [isGenerating, setIsGenerating] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [newToken, setNewToken] = useState<string | null>(null);

    // --- Handlers ---

    const handleAddCredits = async () => {
        router.push('/pricing');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'avatar');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setAvatarUrl(data.url);
        } catch (error) {
            console.error(error);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await updateUserProfile(displayName, avatarUrl);
            
            if (username !== initialUsername && username.trim() !== '') {
                await updateUserUsername(username);
            }

            alert("Profile updated successfully!");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            alert("Failed to update profile: " + error.message);
        } finally {
            setIsSavingProfile(false);
        }
    };



    const handleGenerateToken = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokenName.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateApiToken(tokenName);
            setNewToken(result.token);
            setTokenName('');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to generate token");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteToken = async (id: string) => {
        if (confirm("Are you sure you want to delete this token? This action cannot be undone.")) {
            await deleteApiToken(id);
            router.refresh();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    // Special mode for just the credits button (used in side panel)
    if (mode === 'credits-only') {
        return (
            <button
                onClick={handleAddCredits}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium text-sm"
            >
                Buy Credits & Storage
            </button>
        );
    }

    return (
        <div className="space-y-6">
            {/* Tabs Navigation (Segmented Control) */}
            <div className="flex-none border-b pb-6">
                <div className="inline-flex p-1 bg-muted/50 rounded-lg border">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            activeTab === 'profile'
                                ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Profile
                    </button>

                    <button
                        onClick={() => setActiveTab('tokens')}
                        className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            activeTab === 'tokens'
                                ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="11" width="20" height="8" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        API Tokens
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="py-4">
                
                {/* --- Profile Tab --- */}
                {activeTab === 'profile' && (
                    <div className="max-w-xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Public Profile</h3>
                            <p className="text-sm text-muted-foreground">
                                This information will be displayed on your public profile and projects in the marketplace.
                            </p>

                            {/* Storage Usage Section */}
                            {initialStorage && (
                                <div className="p-6 rounded-xl border bg-card space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Storage Usage</h4>
                                        <a href="/pricing" className="text-xs text-primary hover:underline font-medium">Increase Limit</a>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>{formatBytes(initialStorage.used)} used</span>
                                            <span>{formatBytes(initialStorage.limit)} total</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    initialStorage.percentage > 90 ? 'bg-red-500' :
                                                    initialStorage.percentage > 70 ? 'bg-yellow-500' : 'bg-primary'
                                                }`}
                                                style={{ width: `${initialStorage.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <form onSubmit={handleSaveProfile} className="space-y-4 border p-6 rounded-xl bg-card">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-muted-foreground">?</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {isUploading ? 'Uploading...' : 'JPG, PNG or GIF up to 5MB'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="Your Name"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This name will appear as the author of your projects.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Username (Email Address)</label>
                                    <div className="flex rounded-md shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="flex h-10 w-full rounded-l-md border border-r-0 border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                                            placeholder="username"
                                            pattern="[a-z0-9_]{3,20}"
                                            title="3-20 characters, lowercase letters, numbers, and underscores only"
                                        />
                                        <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground text-sm">
                                            @sealosbja.site
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Your unique username for your integrated email address.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50"
                                    >
                                        {isSavingProfile ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}



                {/* --- Tokens Tab --- */}
                {activeTab === 'tokens' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Access Tokens</h3>
                            <p className="text-xs text-muted-foreground">
                                Manage your personal API keys for external access.
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    Note: These tokens allow access to AgentOS APIs on your behalf. Keep them secret.
                                </p>
                            </div>

                            {/* Create Token Form */}
                            <div className="p-6 rounded-xl border bg-card">
                                <h4 className="font-medium mb-4 text-sm">Generate New Token</h4>
                                <form onSubmit={handleGenerateToken} className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label htmlFor="tokenName" className="text-sm font-medium text-muted-foreground">Token Name</label>
                                        <input
                                            id="tokenName"
                                            type="text"
                                            value={tokenName}
                                            onChange={(e) => setTokenName(e.target.value)}
                                            placeholder="e.g. My Development Key"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isGenerating || !tokenName.trim()}
                                        className="h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50"
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate'}
                                    </button>
                                </form>

                                {newToken && (
                                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-green-800">New Token Generated!</p>
                                            <button 
                                                onClick={() => setNewToken(null)}
                                                className="text-xs text-green-600 hover:underline"
                                            >
                                                Close
                                            </button>
                                        </div>
                                        <p className="text-xs text-green-700 mb-2">Please copy your token now. You won&apos;t be able to see it again.</p>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200">
                                            <code className="flex-1 font-mono text-sm break-all text-green-900">{newToken}</code>
                                            <button
                                                onClick={() => copyToClipboard(newToken)}
                                                className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Token List */}
                            <div className="space-y-4">
                                {initialTokens.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground bg-muted/10">
                                        No API tokens found. Create one to get started.
                                    </div>
                                ) : (
                                    <div className="border rounded-xl overflow-hidden bg-card">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium text-muted-foreground">Name</th>
                                                    <th className="px-6 py-3 font-medium text-muted-foreground">Token (Masked)</th>
                                                    <th className="px-6 py-3 font-medium text-muted-foreground">Last Used</th>
                                                    <th className="px-6 py-3 font-medium text-muted-foreground">Created</th>
                                                    <th className="px-6 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {initialTokens.map((token) => (
                                                    <tr key={token.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-6 py-4 font-medium">{token.name}</td>
                                                        <td className="px-6 py-4 font-mono text-muted-foreground">
                                                            {token.token.substring(0, 6)}...{token.token.substring(token.token.length - 4)}
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {token.lastUsed ? new Date(token.lastUsed).toLocaleDateString() : 'Never'}
                                                        </td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {new Date(token.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteToken(token.id)}
                                                                className="text-red-500 hover:text-red-700 font-medium text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}