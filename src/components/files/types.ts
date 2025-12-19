import { File } from "@/lib/core/entities/resources";
import { Folder, FileShare } from "@/lib/core/entities/filesystem";

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