import { File, Folder, FileShare } from "@prisma/client";

export type FileWithShares = File & { shares: FileShare[] };

export type FolderWithCount = Folder & { 
    _count?: { 
        files: number, 
        children: number 
    } 
};

export type ViewMode = 'grid' | 'list';

export interface BreadcrumbItem {
    id: string | null;
    name: string;
}