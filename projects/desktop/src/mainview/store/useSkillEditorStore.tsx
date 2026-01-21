import { create } from 'zustand';
import { getRpc } from '../rpc';
import { SkillFile } from '../../types/rpc';

type SkillEditorState = {
    currentSkillName: string | null;
    files: SkillFile[];
    expandedFolders: Set<string>;
    selectedFile: string | null;
    fileContent: string;
    isFileLoading: boolean;
    isSaving: boolean;
    error: string | null;

    openSkill: (name: string) => Promise<void>;
    closeSkill: () => void;
    loadFiles: (path?: string) => Promise<void>;
    selectFile: (path: string) => Promise<void>;
    updateFileContent: (content: string) => void;
    saveFile: () => Promise<void>;
    toggleFolder: (path: string) => Promise<void>;
    refreshFiles: () => Promise<void>;
    
    createFile: (path: string) => Promise<void>;
    createDirectory: (path: string) => Promise<void>;
    renameNode: (oldPath: string, newPath: string) => Promise<void>;
    deleteNode: (path: string) => Promise<void>;
    
    // New handler for RPC events
    handleRpcToolEvent: (sessionId: string, name: string) => void;
}

// Helper to merge new children into the file tree
const mergeFiles = (currentFiles: SkillFile[], targetPath: string, newChildren: SkillFile[]): SkillFile[] => {
    if (targetPath === '') return newChildren;
    
    return currentFiles.map(file => {
        if (file.path === targetPath) {
            return { ...file, children: newChildren };
        }
        if (file.type === 'directory' && file.children && targetPath.startsWith(file.path + '/')) {
            return { ...file, children: mergeFiles(file.children, targetPath, newChildren) };
        }
        return file;
    });
};

export const useSkillEditorStore = create<SkillEditorState>((set, get) => ({
    currentSkillName: null,
    files: [],
    expandedFolders: new Set(),
    selectedFile: null,
    fileContent: '',
    isFileLoading: false,
    isSaving: false,
    error: null,

    openSkill: async (name: string) => {
        set({ currentSkillName: name, files: [], selectedFile: null, fileContent: '', error: null, expandedFolders: new Set() });
        await get().loadFiles();
    },

    closeSkill: () => {
        set({ currentSkillName: null, files: [], selectedFile: null, fileContent: '', error: null });
    },

    loadFiles: async (path = '') => {
        const { currentSkillName, files } = get();
        if (!currentSkillName) return;

        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsList({ skillName: currentSkillName, path }) as any;
            if (res.error) throw new Error(res.error);
            
            set({ files: mergeFiles(files, path, res.files) });
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    refreshFiles: async () => {
        // Refresh root and all expanded folders
        const { loadFiles, expandedFolders } = get();
        await loadFiles('');
        for (const path of expandedFolders) {
            await loadFiles(path);
        }
    },

    selectFile: async (path: string) => {
        const { currentSkillName, selectedFile } = get();
        if (!currentSkillName) return;
        if (selectedFile === path) return;

        set({ isFileLoading: true, selectedFile: path, error: null });
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsRead({ skillName: currentSkillName, path }) as any;
            if (res.error) throw new Error(res.error);
            set({ fileContent: res.content });
        } catch (e: any) {
            set({ error: e.message });
        } finally {
            set({ isFileLoading: false });
        }
    },

    updateFileContent: (content: string) => {
        set({ fileContent: content });
    },

    saveFile: async () => {
        const { currentSkillName, selectedFile, fileContent } = get();
        if (!currentSkillName || !selectedFile) return;

        set({ isSaving: true });
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsWrite({ 
                skillName: currentSkillName, 
                path: selectedFile, 
                content: fileContent 
            }) as any;
            if (res.error) throw new Error(res.error);
        } catch (e: any) {
            set({ error: e.message });
        } finally {
            set({ isSaving: false });
        }
    },

    toggleFolder: async (path: string) => {
        const { expandedFolders, loadFiles } = get();
        const newExpanded = new Set(expandedFolders);
        
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
            set({ expandedFolders: newExpanded });
        } else {
            newExpanded.add(path);
            set({ expandedFolders: newExpanded });
            await loadFiles(path);
        }
    },

    createFile: async (path: string) => {
        const { currentSkillName, refreshFiles } = get();
        if (!currentSkillName) return;
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsWrite({ skillName: currentSkillName, path, content: '' }) as any;
            if (res.error) throw new Error(res.error);
            await refreshFiles();
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    createDirectory: async (path: string) => {
        const { currentSkillName, refreshFiles } = get();
        if (!currentSkillName) return;
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsCreateDirectory({ skillName: currentSkillName, path }) as any;
            if (res.error) throw new Error(res.error);
            await refreshFiles();
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    renameNode: async (oldPath: string, newPath: string) => {
        const { currentSkillName, refreshFiles } = get();
        if (!currentSkillName) return;
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsRename({ skillName: currentSkillName, oldPath, newPath }) as any;
            if (res.error) throw new Error(res.error);
            await refreshFiles();
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    deleteNode: async (path: string) => {
        const { currentSkillName, refreshFiles, selectedFile } = get();
        if (!currentSkillName) return;
        try {
            const rpc = await getRpc();
            const res = await rpc.request.skillFsDelete({ skillName: currentSkillName, path }) as any;
            if (res.error) throw new Error(res.error);
            
            if (selectedFile === path) {
                set({ selectedFile: null, fileContent: '' });
            }
            await refreshFiles();
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    handleRpcToolEvent: (sessionId: string, name: string) => {
        const { currentSkillName, refreshFiles } = get();
        // If no skill is open, we don't care
        if (!currentSkillName) return;
        
        // We can check if sessionId matches skill-{currentSkillName}, 
        // OR we can just be generous and refresh if ANY tool runs while a skill is open.
        // Given the user report that file tree isn't updating, let's be generous but log it.
        // Also check if the tool name implies file modification.
        // Actually, let's refresh on ANY tool_end for now to be safe, 
        // as long as it seems relevant to the current session context.
        
        console.log(`[SkillEditorStore] handleRpcToolEvent: ${name} (session: ${sessionId})`);
        
        // Simple heuristic: if we are in a skill session, we likely want to see updates.
        // The cost of refreshFiles is relatively low (list files).
        refreshFiles();
    }
}));
