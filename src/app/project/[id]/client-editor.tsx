'use client';

import { useState, useRef, useEffect } from "react";
import { updateToolCode, runProjectCode, deployTool, generateToolCode, toggleDeploymentStatus, deleteDeployment, updateProjectMetadata, createTool, deleteTool, updateTool } from "@/app/actions";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import DeploymentDialog from "./deployment-dialog";
import ToolDialog from "./tool-dialog";
import { toast } from "@/components/ui/sonner";
import {
    Package,
    Settings,
    Trash2,
    Play,
    ExternalLink,
    Clipboard,
    X,
    Pencil,
    Check,
    ArrowLeft,
    Bot,
    Code2
} from "lucide-react";

function generateCurlCommand(deployment: any) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/api/run/${deployment.id}`;

    const data: Record<string, any> = {};
    if (Array.isArray(deployment.inputs)) {
        deployment.inputs.forEach((input: any) => {
            let val = input.defaultValue;
            if (val === undefined || val === '') {
                if (input.type === 'number') val = 0;
                else if (input.type === 'boolean') val = false;
                else val = "value";
            }
            data[input.name] = val;
        });
    }

    const jsonBody = JSON.stringify(data);

    let cmd = `curl -X POST "${url}" \\`;
    if (deployment.accessType === 'PRIVATE') {
        cmd += `\n  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\`;
    }
    cmd += `\n  -H "Content-Type: application/json" \\
  -d '${jsonBody}'`;

    return cmd;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ClientEditor({ project, isOwner = true }: { project: any; isOwner?: boolean }) {
    // Initialize tools state
    const [tools, setTools] = useState<any[]>(project.tools || []);
    const [activeToolId, setActiveToolId] = useState<string>(project.tools?.[0]?.id || "");

    // Derived active tool
    const activeTool = tools.find(t => t.id === activeToolId);

    // State for current tool's code and inputs
    const [code, setCode] = useState("");
    const [inputs, setInputs] = useState<any[]>([]);

    // Sync state when activeTool changes
    useEffect(() => {
        if (activeTool) {
            setCode(activeTool.code || "");
            setInputs(Array.isArray(activeTool.inputs) ? activeTool.inputs : []);

            // Reset test values
            const initialTestValues: Record<string, any> = {};
            if (Array.isArray(activeTool.inputs)) {
                activeTool.inputs.forEach((inp: any) => {
                    initialTestValues[inp.name] = inp.defaultValue;
                });
            }
            setTestValues(initialTestValues);
            setDeployments(activeTool.deployments || []);

            // Load messages for this tool
            if (activeTool.messages && activeTool.messages.length > 0) {
                setMessages(activeTool.messages.map((m: any) => ({ role: m.role, content: m.content })));
            } else {
                setMessages([{ role: 'assistant', content: `Hello! I can help you write code for ${activeTool.name}.` }]);
            }
        }
    }, [activeToolId, tools]); // Depend on tools to catch updates

    const [testValues, setTestValues] = useState<Record<string, any>>({});
    const [output, setOutput] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);
    const [isDeploymentDialogOpen, setIsDeploymentDialogOpen] = useState(false);
    const [backLink, setBackLink] = useState("/dashboard");

    useEffect(() => {
        const lastChat = localStorage.getItem('agent_os_last_chat_path');
        if (lastChat) {
            setBackLink(lastChat);
        }
    }, []);

    const [deployments, setDeployments] = useState<any[]>([]);

    // State for AI Chat
    const [activeTab, setActiveTab] = useState<'code' | 'chat'>('chat');

    const [messages, setMessages] = useState<Message[]>([]);

    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Rename Project States
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [tempName, setTempName] = useState(project.name);
    const [tempDesc, setTempDesc] = useState(project.description || "");
    const [tempAvatar, setTempAvatar] = useState(project.avatar || "");
    const [isSavingName, setIsSavingName] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New Tool State
    const [isNewToolLoading, setIsNewToolLoading] = useState(false);

    // Tool Dialog States
    const [isToolDialogOpen, setIsToolDialogOpen] = useState(false);
    const [editingToolId, setEditingToolId] = useState<string | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, activeTab]);

    // Handlers

    const handleCreateTool = async (name: string, description: string) => {
        setIsNewToolLoading(true);
        try {
            const newTool = await createTool(project.id, name, description);
            setTools([...tools, newTool]);
            setActiveToolId(newTool.id);
            setIsToolDialogOpen(false);
        } catch (e: any) {
            toast.error("Failed to create tool: " + e.message);
        } finally {
            setIsNewToolLoading(false);
        }
    };

    const handleUpdateTool = async (name: string, description: string) => {
        if (!editingToolId) return;
        setIsNewToolLoading(true);
        try {
            await updateTool(editingToolId, name, description);
            setTools(tools.map(t => t.id === editingToolId ? { ...t, name, description } : t));
            setEditingToolId(null);
            setIsToolDialogOpen(false);
        } catch (e: any) {
            toast.error("Failed to update tool: " + e.message);
        } finally {
            setIsNewToolLoading(false);
        }
    };

    const handleDeleteTool = async (toolId: string) => {
        if (!confirm("Are you sure you want to delete this tool?")) return;
        try {
            await deleteTool(toolId);
            const newTools = tools.filter(t => t.id !== toolId);
            setTools(newTools);
            if (activeToolId === toolId && newTools.length > 0) {
                setActiveToolId(newTools[0].id);
            } else if (newTools.length === 0) {
                setActiveToolId(""); // Handle empty state if needed
            }
        } catch (e: any) {
            toast.error("Failed to delete tool: " + e.message);
        }
    };

    const handleRun = async () => {
        if (!activeToolId) return;
        setIsRunning(true);
        setOutput("Running...");
        try {
            // Save code first
            await updateToolCode(activeToolId, code, inputs);
            // Update local tools state to reflect saved code/inputs
            setTools(tools.map(t => t.id === activeToolId ? { ...t, code, inputs } : t));

            const result = await runProjectCode(code, testValues);

            if (result.exitCode === 0) {
                setOutput(result.stdout || "(No output)");
            } else {
                setOutput(`Error (Exit Code ${result.exitCode}):\n${result.stderr}\n${result.stdout}`);
            }
        } catch (error: any) {
            setOutput(`Execution failed: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const handleDeploy = async (accessType: 'PUBLIC' | 'PRIVATE', category: string) => {
        if (!activeToolId) return;
        setIsDeploying(true);
        try {
            await updateToolCode(activeToolId, code, inputs);
            // Update local tools state
            setTools(tools.map(t => t.id === activeToolId ? { ...t, code, inputs } : t));

            const newDeployment = await deployTool(activeToolId, accessType, category);

            // Check if deployment exists and replace it, otherwise add new
            setDeployments(prev => {
                const exists = prev.some(d => d.id === newDeployment.id);
                if (exists) {
                    return prev.map(d => d.id === newDeployment.id ? newDeployment : d);
                }
                return [newDeployment, ...prev];
            });

            // Update tool's deployments in local state too
            setTools(prevTools => prevTools.map(t =>
                t.id === activeToolId
                    ? {
                        ...t,
                        deployments: t.deployments?.some((d: any) => d.id === newDeployment.id)
                            ? t.deployments.map((d: any) => d.id === newDeployment.id ? newDeployment : d)
                            : [newDeployment, ...(t.deployments || [])]
                    }
                    : t
            ));

            const deploymentUrl = `${window.location.origin}/api/run/${newDeployment.id}`;
            let successMsg = `Deployment Successful!\nURL: ${deploymentUrl}\nType: ${accessType}`;
            if (accessType === 'PRIVATE') {
                successMsg += `\nNote: This is a private deployment. You'll need to use your API Token (from Profile) to access it via API.`;
            }
            setOutput((prev) => (prev ? prev + "\n\n" : "") + successMsg);

            setIsDeploymentDialogOpen(false);
        } catch (error: any) {
            toast.error(`Deployment failed: ${error.message}`);
        } finally {
            setIsDeploying(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isGenerating || !activeToolId) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsGenerating(true);

        try {
            const response = await generateToolCode(activeToolId, userMessage, code);

            const newAssistantMessage = { role: 'assistant', content: response.message } as Message;
            const newMessages = [...messages, { role: 'user', content: userMessage } as Message, newAssistantMessage];

            // Update messages immediately
            setMessages(prev => [...prev, newAssistantMessage]);

            if (response.updatedCode) {
                const newCode = response.updatedCode;
                const newInputs = (response.inputs && Array.isArray(response.inputs)) ? response.inputs : inputs;

                setCode(newCode);

                if (response.inputs && Array.isArray(response.inputs)) {
                    setInputs(response.inputs);
                    const newTestValues: Record<string, any> = {};
                    response.inputs.forEach((inp: any) => {
                        newTestValues[inp.name] = inp.defaultValue;
                    });
                    setTestValues(newTestValues);
                }

                // Update local tools state to reflect changes immediately AND update the messages in tool state
                setTools(prevTools => prevTools.map(t =>
                    t.id === activeToolId
                        ? {
                            ...t,
                            code: newCode,
                            inputs: newInputs,
                            messages: newMessages
                        }
                        : t
                ));
            } else {
                // Even if code didn't change, update messages in tool state to persist chat
                setTools(prevTools => prevTools.map(t =>
                    t.id === activeToolId
                        ? {
                            ...t,
                            messages: newMessages
                        }
                        : t
                ));
            }
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error processing your request: " + error.message }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "project");

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setTempAvatar(data.url);
        } catch (error: any) {
            toast.error("Failed to upload image: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRenameSave = async () => {
        setIsSavingName(true);
        try {
            await updateProjectMetadata(project.id, tempName, tempDesc, tempAvatar);
            setIsRenameOpen(false);
            window.location.reload();
        } catch (error: any) {
            toast.error("Failed to rename: " + error.message);
        } finally {
            setIsSavingName(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-background text-foreground">
            <DeploymentDialog
                isOpen={isDeploymentDialogOpen}
                onClose={() => setIsDeploymentDialogOpen(false)}
                onDeploy={handleDeploy}
                isDeploying={isDeploying}
            />

            {/* Rename Dialog */}
            {/* Tool Create/Edit Dialog */}
            <ToolDialog
                isOpen={isToolDialogOpen}
                onClose={() => {
                    setIsToolDialogOpen(false);
                    setEditingToolId(null);
                }}
                onSave={editingToolId ? handleUpdateTool : handleCreateTool}
                initialName={editingToolId ? tools.find(t => t.id === editingToolId)?.name : ""}
                initialDescription={editingToolId ? tools.find(t => t.id === editingToolId)?.description : ""}
                title={editingToolId ? "Edit Tool" : "Create Tool"}
                isSaving={isNewToolLoading}
            />

            {isRenameOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsRenameOpen(false)}>
                    <div className="w-full max-w-md bg-card p-6 rounded-xl shadow-lg border" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-4">Edit Project Details</h2>
                        <div className="space-y-4">
                            {/* Avatar Upload */}
                            <div className="flex flex-col items-center gap-3 mb-4">
                                <div className="relative w-20 h-20 rounded-full bg-muted overflow-hidden border flex items-center justify-center group">
                                    {tempAvatar ? (
                                        <img src={tempAvatar} alt="Project Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Package className="w-8 h-8 text-muted-foreground" />
                                    )}
                                    <div
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <span className="text-white text-xs font-medium">Change</span>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarUpload}
                                />
                                {isUploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={tempDesc}
                                    onChange={e => setTempDesc(e.target.value)}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsRenameOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground">Cancel</button>
                            <button onClick={handleRenameSave} disabled={isSavingName} className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground">{isSavingName ? "Saving..." : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="h-16 border-b flex justify-between items-center px-6 shrink-0 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Link href={backLink} className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-md hover:bg-muted/50">
                        <ArrowLeft className="w-4 h-4 mr-1" /> {backLink.includes('/agent') ? 'Back to Chat' : 'Back'}
                    </Link>
                    <div className="h-6 w-[1px] bg-border/50"></div>
                    {isOwner ? (
                        <button onClick={() => setIsRenameOpen(true)} className="flex items-center gap-3 group">
                            {project.avatar ? (
                                <img src={project.avatar} alt={project.name} className="w-8 h-8 rounded-full border object-cover bg-muted" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                    <Package className="w-4 h-4" />
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-base hover:underline decoration-dotted underline-offset-4">{project.name}</span>
                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </div>
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            {project.avatar ? (
                                <img src={project.avatar} alt={project.name} className="w-8 h-8 rounded-full border object-cover bg-muted" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-semibold text-base">{project.name}</span>
                                <span className="text-xs text-muted-foreground">by {project.user?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRun}
                        disabled={isRunning || !activeToolId}
                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-5 py-2 shadow-sm border border-border"
                    >
                        {isRunning ? "Running..." : <><Play className="w-4 h-4 mr-2" /> Run</>}
                    </button>
                    {isOwner && (
                        <button
                            onClick={() => setIsDeploymentDialogOpen(true)}
                            disabled={isDeploying || !activeToolId}
                            className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:opacity-90 hover:shadow-md h-10 px-5 py-2 shadow-sm"
                        >
                            Deploy
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">

                {/* Sidebar: Tools List */}
                <div className="w-64 border-r bg-muted/5 flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Tools</h3>
                        {isOwner && (
                            <button
                                onClick={() => {
                                    setEditingToolId(null);
                                    setIsToolDialogOpen(true);
                                }}
                                disabled={isNewToolLoading}
                                className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded transition-colors"
                            >
                                + New
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {tools.map(tool => (
                            <div
                                key={tool.id}
                                onClick={() => setActiveToolId(tool.id)}
                                className={`px-4 py-3 cursor-pointer border-l-2 transition-all hover:bg-muted/50 group ${activeToolId === tool.id
                                        ? 'border-primary bg-muted/30'
                                        : 'border-transparent'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="font-medium text-sm truncate">{tool.name}</div>
                                        {tool.description && (
                                            <div className="text-xs text-muted-foreground truncate">{tool.description}</div>
                                        )}
                                    </div>
                                    {isOwner && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingToolId(tool.id);
                                                    setIsToolDialogOpen(true);
                                                }}
                                                className="text-muted-foreground hover:text-primary p-1"
                                                title="Edit Tool"
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTool(tool.id); }}
                                                className="text-muted-foreground hover:text-destructive p-1"
                                                title="Delete Tool"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Left: Tabs & Content */}
                <div className="w-1/2 flex flex-col border-r bg-muted/5">
                    {/* Tabs (Segmented Control) */}
                    <div className="flex-none p-3 border-b bg-card">
                        <div className="flex p-1 bg-muted/50 rounded-lg border">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'chat'
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                <Bot className="w-4 h-4" />
                                AI Assistant
                            </button>
                            <button
                                onClick={() => setActiveTab('code')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === 'code'
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                    }`}
                            >
                                <Code2 className="w-4 h-4" />
                                Editor
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 relative overflow-hidden">

                        {/* CHAT TAB */}
                        <div className={`absolute inset-0 flex flex-col bg-background transition-opacity duration-200 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-card text-foreground border rounded-tl-sm'
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {isGenerating && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted text-foreground border rounded-2xl rounded-tl-sm px-5 py-3 text-sm animate-pulse">
                                            Thinking...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-6 border-t bg-card/50 backdrop-blur-sm">
                                <div className="flex gap-3 shadow-sm rounded-xl bg-background border p-1 focus-within:ring-2 focus-within:ring-ring/20 transition-all">
                                    <input
                                        type="text"
                                        className="flex-1 h-10 rounded-lg bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                                        placeholder="Ask me to write or modify code..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
                                        disabled={isGenerating}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isGenerating || !input.trim()}
                                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-primary text-primary-foreground hover:opacity-90 h-10 px-5 py-2 shadow-sm"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CODE TAB */}
                        <div className={`absolute inset-0 bg-background flex flex-col transition-opacity duration-200 ${activeTab === 'code' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                            <div className="flex-1 relative">
                                <Editor
                                    height="100%"
                                    defaultLanguage="python"
                                    theme="vs-dark"
                                    value={code}
                                    onChange={(value) => {
                                        if (isOwner) setCode(value || "");
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineHeight: 24,
                                        wordWrap: "on",
                                        automaticLayout: true,
                                        padding: { top: 16, bottom: 16 },
                                        readOnly: !isOwner
                                    }}
                                />
                            </div>



                        </div>

                    </div>
                </div>

                {/* Right: Output & Deployments */}
                <div className="w-1/2 flex flex-col bg-background border-l">
                    {/* Parameter Configuration Panel */}
                    <div className="h-1/3 border-t bg-card flex flex-col">
                        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
                            <h3 className="text-sm font-semibold text-foreground">Inputs</h3>
                            {isOwner && (
                                <button
                                    onClick={() => {
                                        const newParam = { name: `arg${inputs.length + 1}`, type: 'string', defaultValue: 'World' };
                                        setInputs([...inputs, newParam]);
                                        setTestValues({ ...testValues, [newParam.name]: 'World' });
                                    }}
                                    className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    + Add Input
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-6 space-y-4">
                            {inputs.length === 0 && (
                                <div className="text-center text-muted-foreground text-sm py-8 italic">
                                    No inputs defined. Code will run without arguments.
                                </div>
                            )}
                            {inputs.map((input, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-background border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
                                        <input
                                            type="text"
                                            value={input.name}
                                            onChange={(e) => {
                                                const newInputs = [...inputs];
                                                newInputs[idx].name = e.target.value;
                                                setInputs(newInputs);
                                                // Update test values key
                                                const oldName = input.name;
                                                const newName = e.target.value;
                                                if (oldName !== newName) {
                                                    const newTestValues = { ...testValues };
                                                    newTestValues[newName] = newTestValues[oldName];
                                                    delete newTestValues[oldName];
                                                    setTestValues(newTestValues);
                                                }
                                            }}
                                            className="text-sm border rounded-md px-3 py-1.5 bg-muted/30 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="param_name"
                                        />
                                    </div>
                                    <div className="w-28 flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</label>
                                        <select
                                            value={input.type}
                                            onChange={(e) => {
                                                const newInputs = [...inputs];
                                                newInputs[idx].type = e.target.value;
                                                setInputs(newInputs);
                                            }}
                                            className="text-sm border rounded-md px-3 py-1.5 bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1.5">
                                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Default / Test Value</label>
                                        <input
                                            type="text"
                                            value={testValues[input.name] || ''}
                                            onChange={(e) => {
                                                setTestValues({
                                                    ...testValues,
                                                    [input.name]: e.target.value
                                                });
                                                // Also update default value definition
                                                const newInputs = [...inputs];
                                                newInputs[idx].defaultValue = e.target.value;
                                                setInputs(newInputs);
                                            }}
                                            className="text-sm border rounded-md px-3 py-1.5 bg-muted/30 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Value"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newInputs = inputs.filter((_, i) => i !== idx);
                                            setInputs(newInputs);
                                            const newTestValues = { ...testValues };
                                            delete newTestValues[input.name];
                                            setTestValues(newTestValues);
                                        }}
                                        className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors self-end mb-0.5"
                                        title="Remove Input"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Right: Console Output */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e] text-gray-200 font-mono text-sm">
                        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#252526]">
                            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Console Output</span>
                            {output && <button onClick={() => setOutput(null)} className="text-xs text-gray-400 hover:text-white transition-colors">Clear</button>}
                        </div>
                        <div className="flex-1 p-6 overflow-auto">
                            <pre className="whitespace-pre-wrap break-all leading-relaxed">{output || <span className="text-gray-500 italic">Ready to run...</span>}</pre>
                        </div>
                    </div>

                    {/* Bottom Right: Deployments */}
                    <div className="h-1/3 flex flex-col bg-muted/5 border-t">
                        <div className="px-6 py-3 border-b bg-muted/10">
                            <h3 className="font-semibold text-sm">Recent Deployments (Active Tool)</h3>
                        </div>
                        <div className="flex-1 overflow-auto p-6 space-y-3">
                            {deployments.map((dep: any) => (
                                <div
                                    key={dep.id}
                                    className="flex justify-between items-center text-sm p-4 bg-card border rounded-lg shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px] bg-muted/50 px-1.5 py-0.5 rounded">{dep.id}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${dep.accessType === 'PRIVATE'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                {dep.accessType || 'PUBLIC'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(dep.createdAt).toLocaleDateString()} • {new Date(dep.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground font-mono border border-border">
                                            {dep.callCount} calls
                                        </span>

                                        {isOwner ? (
                                            dep.isActive ? (
                                                <button
                                                    onClick={async () => {
                                                        if (confirm("Are you sure you want to deactivate this endpoint?")) {
                                                            await toggleDeploymentStatus(dep.id, false);
                                                            setDeployments(deployments.map(d => d.id === dep.id ? { ...d, isActive: false } : d));
                                                        }
                                                    }}
                                                    className="text-xs text-green-700 hover:text-green-900 font-medium px-2.5 py-1 bg-green-50 rounded-md border border-green-200 transition-colors"
                                                >
                                                    Active
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        await toggleDeploymentStatus(dep.id, true);
                                                        setDeployments(deployments.map(d => d.id === dep.id ? { ...d, isActive: true } : d));
                                                    }}
                                                    className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200 transition-colors"
                                                >
                                                    Inactive
                                                </button>
                                            )
                                        ) : (
                                            dep.isActive ? (
                                                <span className="text-xs text-green-700 font-medium px-2.5 py-1 bg-green-50 rounded-md border border-green-200 cursor-default">Active</span>
                                            ) : (
                                                <span className="text-xs text-gray-500 font-medium px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200 cursor-default">Inactive</span>
                                            )
                                        )}

                                        <a
                                            href={`/api/run/${dep.id}`}
                                            target="_blank"
                                            className={`text-primary hover:underline text-xs font-medium flex items-center gap-1 ${!dep.isActive ? 'opacity-50 pointer-events-none' : ''}`}
                                        >
                                            Open <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>

                                        {isOwner && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm("Delete this deployment? This cannot be undone.")) {
                                                        await deleteDeployment(dep.id);
                                                        setDeployments(deployments.filter(d => d.id !== dep.id));
                                                    }
                                                }}
                                                className="text-muted-foreground hover:text-destructive text-xs px-1.5 transition-colors"
                                                title="Delete Deployment"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                const curl = generateCurlCommand(dep);
                                                navigator.clipboard.writeText(curl);
                                                toast.success("Curl command copied to clipboard!");
                                            }}
                                            className="text-muted-foreground hover:text-primary text-xs px-1.5 transition-colors"
                                            title="Copy Curl Command"
                                        >
                                            <Clipboard className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {deployments.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl bg-muted/5">
                                    No deployments for this tool yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}