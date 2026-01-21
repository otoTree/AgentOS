import React, { useEffect, useState } from 'react';
import { Terminal, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { getRpc } from '../../mainview/rpc';
import { PythonPackage } from '../../types/rpc';

export default function PythonSection() {
    const [packages, setPackages] = useState<PythonPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [newPackage, setNewPackage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const loadPackages = async () => {
        setLoading(true);
        setError(null);
        try {
            const rpc = await getRpc();
            const res = await rpc.request.listPythonPackages({}) as any;
            setPackages(res.packages || []);
        } catch (e: any) {
            console.error("Failed to load python packages", e);
            setError("Failed to load packages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);

    const handleInstall = async () => {
        if (!newPackage.trim()) return;
        setInstalling(true);
        setError(null);
        try {
            const rpc = await getRpc();
            const res = await rpc.request.installPythonPackage({ pkg: newPackage }) as any;
            if (res.success) {
                setNewPackage('');
                await loadPackages();
            } else {
                setError(res.error || "Installation failed");
            }
        } catch (e: any) {
            setError(e.message || "Installation failed");
        } finally {
            setInstalling(false);
        }
    };

    const handleUninstall = async (pkgName: string) => {
        if (!confirm(`Uninstall ${pkgName}?`)) return;
        try {
            const rpc = await getRpc();
            const res = await rpc.request.uninstallPythonPackage({ pkg: pkgName }) as any;
            if (res.success) {
                await loadPackages();
            } else {
                alert(res.error || "Uninstall failed");
            }
        } catch (e: any) {
             alert(e.message || "Uninstall failed");
        }
    };

    return (
        <section>
            <h3 className="text-sm font-semibold text-black/90 mb-4 pb-2 border-b border-border flex items-center justify-between">
                <span>Python Environment (Managed)</span>
                <button onClick={loadPackages} disabled={loading} className="text-black/40 hover:text-black transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </h3>
            
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm mb-4">
                 <div className="flex items-center gap-2 mb-4">
                    <input 
                        type="text" 
                        value={newPackage}
                        onChange={(e) => setNewPackage(e.target.value)}
                        placeholder="Package name (e.g. pandas)"
                        className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-black/20 focus:ring-1 focus:ring-black/5 transition-all bg-gray-50/50"
                        onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
                    />
                    <button 
                        onClick={handleInstall}
                        disabled={installing || !newPackage.trim()}
                        className="bg-black hover:bg-black/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        {installing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Install
                    </button>
                 </div>
                 {error && <div className="text-red-500 text-xs mb-3 px-1">{error}</div>}
                 
                 <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {loading && packages.length === 0 ? (
                        <div className="text-center text-black/40 py-8 text-xs flex flex-col items-center gap-2">
                            <Loader2 size={16} className="animate-spin opacity-50" />
                            <span>Loading packages...</span>
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="text-center text-black/40 py-8 text-xs border border-dashed border-black/10 rounded-lg bg-gray-50/30">
                            No packages installed
                        </div>
                    ) : (
                        packages.map((pkg) => (
                            <div key={pkg.name} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg group transition-colors border border-transparent hover:border-black/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-black/40">
                                        <Terminal size={12} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-black/90">{pkg.name}</span>
                                        <span className="text-[10px] text-black/40 font-mono">{pkg.version}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleUninstall(pkg.name)}
                                    className="text-black/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded hover:bg-red-50"
                                    title="Uninstall"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </section>
    );
}
