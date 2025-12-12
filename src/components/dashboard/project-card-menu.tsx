'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { deleteProject } from '@/app/actions';
import { toast } from 'sonner';

interface ProjectCardMenuProps {
    projectId: string;
    projectName: string;
    projectDescription?: string;
    projectAvatar?: string | null;
}

export default function ProjectCardMenu({ projectId, projectName }: ProjectCardMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation();
        
        if (!confirm(`Are you sure you want to delete "${projectName}"?`)) return;

        try {
            await deleteProject(projectId);
            toast.success("Project deleted");
            setIsOpen(false);
        } catch (error) {
            toast.error("Failed to delete project");
            console.error(error);
        }
    };

    return (
        <div className="relative" onClick={(e) => e.preventDefault()}>
            <button 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-popover text-popover-foreground rounded-md border shadow-md z-20 py-1">
                        <button
                            onClick={handleDelete}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
