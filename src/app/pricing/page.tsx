'use client';

import { useState } from 'react';
import { purchaseCredits, purchaseStorage } from './actions';
import NavBar from '@/components/nav-bar';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePurchaseCredits = async (amount: number, cost: number) => {
        if (isProcessing) return;
        if (!confirm(`Confirm purchase of ${amount} credits for $${cost}? (Simulation)`)) return;

        setIsProcessing(true);
        try {
            await purchaseCredits(amount, cost);
            alert(`Successfully purchased ${amount} credits!`);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Purchase failed");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePurchaseStorage = async (gb: number, cost: number) => {
        if (isProcessing) return;
        if (!confirm(`Confirm purchase of ${gb}GB storage for $${cost}? (Simulation)`)) return;

        setIsProcessing(true);
        try {
            const bytes = gb * 1024 * 1024 * 1024;
            await purchaseStorage(bytes, cost);
            alert(`Successfully purchased ${gb}GB storage!`);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Purchase failed");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className="container max-w-5xl py-12 mx-auto px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Upgrade Your Capabilities</h1>
                    <p className="text-xl text-muted-foreground">
                        Choose the resources you need to build bigger and faster.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Credits Section */}
                    <div className="space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">AI Credits</h2>
                            <p className="text-muted-foreground">For generating code and using AI agents</p>
                        </div>
                        
                        <div className="grid gap-4">
                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <h3 className="font-bold text-lg">Starter Pack</h3>
                                    <p className="text-sm text-muted-foreground">100 Credits</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseCredits(100, 5)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                >
                                    $5.00
                                </button>
                            </div>

                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg font-medium">
                                    Popular
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Pro Pack</h3>
                                    <p className="text-sm text-muted-foreground">500 Credits</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseCredits(500, 20)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                    $20.00
                                </button>
                            </div>

                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <h3 className="font-bold text-lg">Power Pack</h3>
                                    <p className="text-sm text-muted-foreground">2,000 Credits</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseCredits(2000, 75)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                >
                                    $75.00
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Storage Section */}
                    <div className="space-y-8">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">Storage Expansion</h2>
                            <p className="text-muted-foreground">Store more files, assets, and project data</p>
                        </div>
                        
                        <div className="grid gap-4">
                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <h3 className="font-bold text-lg">Extra Gig</h3>
                                    <p className="text-sm text-muted-foreground">+1 GB Storage</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseStorage(1, 2)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                >
                                    $2.00
                                </button>
                            </div>

                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <h3 className="font-bold text-lg">Standard Expansion</h3>
                                    <p className="text-sm text-muted-foreground">+5 GB Storage</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseStorage(5, 8)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                >
                                    $8.00
                                </button>
                            </div>

                            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors flex items-center justify-between group">
                                <div>
                                    <h3 className="font-bold text-lg">Massive Vault</h3>
                                    <p className="text-sm text-muted-foreground">+20 GB Storage</p>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseStorage(20, 25)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                                >
                                    $25.00
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-16 text-center text-sm text-muted-foreground">
                    <p>This is a simulation. No actual payments are processed.</p>
                </div>
            </div>
        </div>
    );
}