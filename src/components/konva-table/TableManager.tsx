'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import KonvaTable, { KonvaTableRef } from './KonvaTable';
import { GridData, Workbook, Sheet } from './types';
import { Plus, Trash2, Pencil, Table as TableIcon, Save, FolderOpen, FileSpreadsheet, Loader2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { listWorkbooks, loadWorkbook, saveWorkbookToOss, deleteWorkbookFromOss } from '@/app/excel-actions';

// Helper for ID
const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);

export function TableManager() {
    // List of available workbooks (metadata only)
    const [workbookList, setWorkbookList] = useState<{id: string, name: string, lastModified: number}[]>([]);
    
    // Currently active full workbook
    const [activeWorkbook, setActiveWorkbook] = useState<Workbook | null>(null);
    
    // UI States
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [isLoadingWorkbook, setIsLoadingWorkbook] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const tableRef = useRef<KonvaTableRef>(null);

    // Auto-save timer ref
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Load workbook list on mount
    const fetchWorkbookList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const { workbooks, error } = await listWorkbooks();
            if (error) throw new Error(error);
            setWorkbookList(workbooks || []);
        } catch (e: any) {
            toast.error(`Failed to load workbooks: ${e.message}`);
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    useEffect(() => {
        fetchWorkbookList();
    }, [fetchWorkbookList]);

    // Load a specific workbook
    const handleLoadWorkbook = async (id: string) => {
        if (activeWorkbook?.id === id) return;
        
        // If current is dirty, maybe ask to save? 
        // For now, we rely on auto-save or manual save.
        
        setIsLoadingWorkbook(true);
        try {
            const { workbook, error } = await loadWorkbook(id);
            if (error) throw new Error(error);
            if (workbook) {
                setActiveWorkbook(workbook);
            }
        } catch (e: any) {
            toast.error(`Failed to open workbook: ${e.message}`);
        } finally {
            setIsLoadingWorkbook(false);
        }
    };

    // Create new workbook
    const handleCreateWorkbook = async () => {
        const newWb: Workbook = {
            id: generateId(),
            name: `Workbook ${workbookList.length + 1}`,
            sheets: [{
                id: generateId(),
                name: 'Sheet 1',
                data: Array(20).fill(0).map(() => Array(10).fill(''))
            }],
            activeSheetId: null, // Will be set below
            isDirty: true
        };
        newWb.activeSheetId = newWb.sheets[0].id;

        // Save immediately to OSS so it appears in list
        setIsSaving(true);
        try {
            const { success, error } = await saveWorkbookToOss(newWb);
            if (!success) throw new Error(error);
            
            await fetchWorkbookList(); // Refresh list
            setActiveWorkbook(newWb);
            toast.success("New workbook created");
        } catch (e: any) {
            toast.error(`Failed to create workbook: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete workbook
    const handleDeleteWorkbook = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this workbook?')) return;
        
        try {
            const { success, error } = await deleteWorkbookFromOss(id);
            if (!success) throw new Error(error);
            
            toast.success("Workbook deleted");
            if (activeWorkbook?.id === id) {
                setActiveWorkbook(null);
            }
            fetchWorkbookList();
        } catch (e: any) {
            toast.error(`Failed to delete workbook: ${e.message}`);
        }
    };

    // Save current workbook
    const handleSave = async () => {
        if (!activeWorkbook) return;
        setIsSaving(true);
        try {
            const { success, error } = await saveWorkbookToOss(activeWorkbook);
            if (!success) throw new Error(error);
            
            setActiveWorkbook(prev => prev ? ({ ...prev, isDirty: false }) : null);
            toast.success("Workbook saved");
            fetchWorkbookList(); // Update last modified
        } catch (e: any) {
            toast.error(`Failed to save: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save logic
    useEffect(() => {
        if (activeWorkbook?.isDirty) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                handleSave();
            }, 5000); // Auto save after 5s of inactivity
        }
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [activeWorkbook]); // activeWorkbook changes on every edit, so this debounces

    // Workbook Operations
    const handleAddSheet = () => {
        if (!activeWorkbook) return;
        const newSheet: Sheet = {
            id: generateId(),
            name: `Sheet ${activeWorkbook.sheets.length + 1}`,
            data: Array(20).fill(0).map(() => Array(10).fill(''))
        };
        setActiveWorkbook(prev => {
            if (!prev) return null;
            return {
                ...prev,
                sheets: [...prev.sheets, newSheet],
                activeSheetId: newSheet.id,
                isDirty: true
            };
        });
    };

    const handleDeleteSheet = (sheetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeWorkbook) return;
        if (activeWorkbook.sheets.length <= 1) {
            toast.warning("Cannot delete the last sheet");
            return;
        }
        if (!confirm('Delete this sheet?')) return;

        setActiveWorkbook(prev => {
            if (!prev) return null;
            const newSheets = prev.sheets.filter(s => s.id !== sheetId);
            let newActiveId = prev.activeSheetId;
            if (prev.activeSheetId === sheetId) {
                newActiveId = newSheets[0].id;
            }
            return {
                ...prev,
                sheets: newSheets,
                activeSheetId: newActiveId,
                isDirty: true
            };
        });
    };

    const handleRenameSheet = (sheetId: string, newName: string) => {
        setActiveWorkbook(prev => {
            if (!prev) return null;
            return {
                ...prev,
                sheets: prev.sheets.map(s => s.id === sheetId ? { ...s, name: newName } : s),
                isDirty: true
            };
        });
    };

    const handleDataChange = useCallback((newData: GridData) => {
        setActiveWorkbook(prev => {
            if (!prev || !prev.activeSheetId) return null;
            return {
                ...prev,
                sheets: prev.sheets.map(s => s.id === prev.activeSheetId ? { ...s, data: newData } : s),
                isDirty: true
            };
        });
    }, []);

    const activeSheet = activeWorkbook?.sheets.find(s => s.id === activeWorkbook.activeSheetId);

    return (
        <div className="flex h-full w-full bg-background text-foreground font-sans overflow-hidden">
            {/* Sidebar - Workbooks */}
            <div className="w-64 bg-muted/30 border-r border-border flex flex-col flex-shrink-0">
                <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                        <FolderOpen size={16} /> Workbooks
                    </span>
                    <button 
                        onClick={fetchWorkbookList} 
                        disabled={isLoadingList}
                        className="p-1 hover:bg-accent rounded text-muted-foreground"
                    >
                        <RotateCw size={14} className={isLoadingList ? "animate-spin" : ""} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {workbookList.map(wb => (
                        <div 
                            key={wb.id}
                            onClick={() => handleLoadWorkbook(wb.id)}
                            className={`
                                group flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                                ${activeWorkbook?.id === wb.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50 text-muted-foreground'}
                            `}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <FileSpreadsheet size={16} className="flex-shrink-0" />
                                <span className="truncate">{wb.name}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeleteWorkbook(wb.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    
                    {workbookList.length === 0 && !isLoadingList && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No workbooks found
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-border">
                    <button 
                        onClick={handleCreateWorkbook}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                    >
                        <Plus size={14} /> New Workbook
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Toolbar */}
                {activeWorkbook && (
                    <div className="h-10 border-b border-border flex items-center px-4 justify-between bg-background">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{activeWorkbook.name}</span>
                            {activeWorkbook.isDirty && <span className="text-xs text-amber-500">(Unsaved)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || !activeWorkbook.isDirty}
                                className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors
                                    ${activeWorkbook.isDirty 
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'text-muted-foreground cursor-not-allowed bg-muted'}
                                `}
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                    </div>
                )}

                {/* Table Content */}
                <div className="flex-1 overflow-hidden relative bg-muted/20">
                    {isLoadingWorkbook ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                            <Loader2 size={32} className="animate-spin text-primary" />
                        </div>
                    ) : null}

                    {activeWorkbook && activeSheet ? (
                        <KonvaTable
                            key={`${activeWorkbook.id}-${activeSheet.id}`} // Remount on workbook or sheet switch to ensure data isolation
                            ref={tableRef}
                            initialData={activeSheet.data}
                            onDataChange={handleDataChange}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <TableIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Select or create a workbook to start</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Tabs */}
                {activeWorkbook && (
                    <div className="flex-shrink-0 bg-muted/30 flex items-center border-t border-border h-9 select-none">
                        <div className="flex items-center px-2 border-r border-border mr-1">
                            <button 
                                onClick={handleAddSheet}
                                className="p-1 hover:bg-accent rounded text-muted-foreground"
                                title="Add Sheet"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        
                        <div className="flex overflow-x-auto no-scrollbar h-full items-end gap-0.5 px-1">
                            {activeWorkbook.sheets.map(sheet => (
                                <div 
                                    key={sheet.id}
                                    onClick={() => setActiveWorkbook(prev => prev ? ({ ...prev, activeSheetId: sheet.id }) : null)}
                                    className={`
                                        group flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer border-r border-border min-w-[100px] max-w-[200px] rounded-t-sm
                                        ${activeWorkbook.activeSheetId === sheet.id 
                                            ? 'bg-background text-primary font-medium border-t-2 border-t-primary shadow-sm' 
                                            : 'bg-muted text-muted-foreground hover:bg-accent/50 border-b border-border'
                                        }
                                    `}
                                >
                                    <span className="truncate flex-1">{sheet.name}</span>
                                    {activeWorkbook.activeSheetId === sheet.id && (
                                        <div className="flex items-center opacity-0 group-hover:opacity-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newName = prompt("Rename sheet:", sheet.name);
                                                    if (newName) handleRenameSheet(sheet.id, newName);
                                                }}
                                                className="p-0.5 hover:text-primary"
                                            >
                                                <Pencil size={10} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteSheet(sheet.id, e)}
                                                className="p-0.5 hover:text-destructive ml-1"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
