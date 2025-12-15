'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Database, History, Settings, BarChart, Table as TableIcon, Terminal, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getDataSources, saveDataSource, deleteDataSource, testConnection, executeQuery, executeNaturalLanguageQuery } from '../modules/data-sources';
import { toast } from 'sonner';

export function SmartQueryWindow() {
    const [activeTab, setActiveTab] = useState<'query' | 'history' | 'sources'>('query');
    const [queryMode, setQueryMode] = useState<'sql' | 'nl'>('sql');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [generatedQuery, setGeneratedQuery] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    
    // Data Sources State
    const [dataSources, setDataSources] = useState<any[]>([]);
    const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>('');
    const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'postgres',
        host: '',
        port: '5432',
        user: '',
        password: '',
        database: '',
        ssl: false
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);

    useEffect(() => {
        loadDataSources();
    }, []);

    const loadDataSources = async () => {
        try {
            const sources = await getDataSources();
            setDataSources(sources);
            if (sources.length > 0 && !selectedDataSourceId) {
                setSelectedDataSourceId(sources[0].id);
            }
        } catch (e) {
            console.error("Failed to load data sources", e);
        }
    };

    const handleExecute = async () => {
        if (!selectedDataSourceId) {
            toast.error("Please select a data source");
            return;
        }
        if (!query.trim()) {
            toast.error("Please enter a query");
            return;
        }

        setIsExecuting(true);
        setResults(null);
        setGeneratedQuery(null);
        try {
            let result;
            if (queryMode === 'nl') {
                result = await executeNaturalLanguageQuery(selectedDataSourceId, query);
                if (result.success && result.generatedQuery) {
                    setGeneratedQuery(result.generatedQuery);
                }
            } else {
                result = await executeQuery(selectedDataSourceId, query);
            }

            if (result.success) {
                setResults(result.data);
                toast.success("Query executed successfully");
            } else {
                toast.error("Query failed: " + result.error);
            }
        } catch (e) {
            toast.error("Execution error");
        } finally {
            setIsExecuting(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const config = {
                host: formData.host,
                port: parseInt(formData.port),
                user: formData.user,
                password: formData.password,
                database: formData.database,
                ssl: formData.ssl
            };
            const result = await testConnection(formData.type, config);
            setTestResult(result);
            if (result.success) toast.success("Connection successful");
            else toast.error("Connection failed");
        } catch (e) {
            setTestResult({ success: false, message: "Test failed" });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveSource = async () => {
        try {
            const config = {
                host: formData.host,
                port: parseInt(formData.port),
                user: formData.user,
                password: formData.password,
                database: formData.database,
                ssl: formData.ssl
            };
            
            await saveDataSource({
                id: editingSource?.id,
                name: formData.name,
                type: formData.type,
                config
            });

            toast.success("Data source saved");
            setIsAddSourceOpen(false);
            setEditingSource(null);
            resetForm();
            loadDataSources();
        } catch (e) {
            toast.error("Failed to save data source");
        }
    };

    const handleDeleteSource = async (id: string) => {
        if (!confirm("Are you sure you want to delete this data source?")) return;
        try {
            await deleteDataSource(id);
            toast.success("Data source deleted");
            loadDataSources();
        } catch (e) {
            toast.error("Failed to delete data source");
        }
    };

    const openEdit = (source: any) => {
        setEditingSource(source);
        const config = source.config as any;
        setFormData({
            name: source.name,
            type: source.type,
            host: config.host || '',
            port: config.port?.toString() || '',
            user: config.user || '',
            password: config.password || '',
            database: config.database || '',
            ssl: config.ssl || false
        });
        setIsAddSourceOpen(true);
        setTestResult(null);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'postgres',
            host: '',
            port: '5432',
            user: '',
            password: '',
            database: '',
            ssl: false
        });
        setTestResult(null);
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
                <Button 
                    variant={activeTab === 'query' ? 'secondary' : 'ghost'} 
                    size="sm"
                    onClick={() => setActiveTab('query')}
                    className="gap-2"
                >
                    <Terminal className="w-4 h-4" />
                    Query
                </Button>
                <Button 
                    variant={activeTab === 'sources' ? 'secondary' : 'ghost'} 
                    size="sm"
                    onClick={() => setActiveTab('sources')}
                    className="gap-2"
                >
                    <Database className="w-4 h-4" />
                    Data Sources
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">
                {activeTab === 'query' && (
                    <div className="flex flex-col h-full gap-4">
                        <div className="flex-none space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label>Source:</Label>
                                    <Select value={selectedDataSourceId} onValueChange={setSelectedDataSourceId}>
                                        <SelectTrigger className="w-[200px] h-8">
                                            <SelectValue placeholder="Select Data Source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dataSources.map(ds => (
                                                <SelectItem key={ds.id} value={ds.id}>{ds.name} ({ds.type})</SelectItem>
                                            ))}
                                            {dataSources.length === 0 && (
                                                <div className="p-2 text-xs text-muted-foreground text-center">No sources configured</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <select 
                                        className="text-sm border rounded px-2 py-1 bg-background"
                                        value={queryMode}
                                        onChange={(e) => setQueryMode(e.target.value as any)}
                                    >
                                        <option value="sql">SQL / Command</option>
                                        <option value="nl">Natural Language</option>
                                    </select>
                                </div>
                            </div>
                            <div className="relative">
                                <Textarea 
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={queryMode === 'nl' ? "Show me all users over 18..." : "SELECT * FROM users LIMIT 10;"}
                                    className="min-h-[100px] font-mono"
                                />
                                <div className="absolute bottom-2 right-2">
                                    <Button size="sm" onClick={handleExecute} disabled={isExecuting} className="gap-2">
                                        {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                        Run
                                    </Button>
                                </div>
                            </div>
                            {generatedQuery && (
                                <div className="p-2 bg-muted/30 rounded text-xs font-mono border">
                                    <div className="text-muted-foreground mb-1">Generated Command:</div>
                                    <div className="whitespace-pre-wrap">{generatedQuery}</div>
                                </div>
                            )}
                        </div>

                        {/* Results */}
                        <div className="flex-1 border rounded-md overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-2 border-b bg-muted/10">
                                <span className="text-xs font-medium text-muted-foreground">Results</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <TableIcon className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-0">
                                {results ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                {results.columns.map((col: string, i: number) => (
                                                    <th key={i} className="px-3 py-2 text-left font-medium border-b whitespace-nowrap">
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.rows.map((row: any[], i: number) => (
                                                <tr key={i} className="hover:bg-muted/10">
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="px-3 py-2 border-b border-muted/20 whitespace-nowrap">
                                                            {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                        {isExecuting ? 'Running query...' : 'Run a query to see results'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Data Sources</h3>
                            <Button size="sm" className="gap-2" onClick={() => { setEditingSource(null); resetForm(); setIsAddSourceOpen(true); }}>
                                <Plus className="w-3 h-3" />
                                Add Source
                            </Button>
                        </div>
                        <div className="grid gap-4">
                            {dataSources.map(ds => (
                                <Card key={ds.id} className="p-4 flex items-center gap-4">
                                    <div className={`p-2 rounded ${ds.type.includes('mongo') ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                                        <Database className={`w-5 h-5 ${ds.type.includes('mongo') ? 'text-green-600 dark:text-green-300' : 'text-blue-600 dark:text-blue-300'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium">{ds.name}</h4>
                                        <p className="text-xs text-muted-foreground">{ds.type} • {ds.config?.host}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openEdit(ds)}>Configure</Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSource(ds.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                            
                            {dataSources.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                    No data sources configured. Add one to get started.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={isAddSourceOpen} onOpenChange={setIsAddSourceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingSource ? 'Edit Data Source' : 'Add Data Source'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Name</Label>
                            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-3" placeholder="My Database" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Type</Label>
                            <Select 
                                value={formData.type} 
                                onValueChange={(val) => {
                                    let port = '5432';
                                    if (val === 'mysql' || val === 'tidb') port = '3306';
                                    if (val === 'mongodb') port = '27017';
                                    if (val === 'neo4j') port = '7687';
                                    if (val === 'redis') port = '6379';
                                    setFormData({...formData, type: val, port});
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                                    <SelectItem value="mysql">MySQL</SelectItem>
                                    <SelectItem value="tidb">TiDB (MySQL Protocol)</SelectItem>
                                    <SelectItem value="mongodb">MongoDB</SelectItem>
                                    <SelectItem value="neo4j">Neo4j</SelectItem>
                                    <SelectItem value="redis">Redis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Host</Label>
                            <Input value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} className="col-span-3" placeholder="localhost" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Port</Label>
                            <Input value={formData.port} onChange={e => setFormData({...formData, port: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">User</Label>
                            <Input value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Password</Label>
                            <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Database</Label>
                            <Input value={formData.database} onChange={e => setFormData({...formData, database: e.target.value})} className="col-span-3" />
                        </div>

                        {testResult && (
                            <div className={`flex items-center gap-2 p-2 rounded text-sm ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {testResult.message || (testResult.success ? 'Connection Successful' : 'Connection Failed')}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                        </Button>
                        <Button type="button" onClick={handleSaveSource}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
