import {
  getFiles,
  getFolders,
  createFile,
  updateFileContent,
  deleteFile
} from "@/app/file-actions";
import { fileRepository } from "@/lib/repositories/file-repository";

export async function handleFileSystemTool(call: any, userId: string) {
    if (call.name === 'fs_list_files') {
        try {
            const folderId = call.arguments?.folderId || null;
            const files = await getFiles("", folderId); // Assuming user has access
            const folders = await getFolders(folderId);
            
            return JSON.stringify({
                files: files.map((f: any) => ({ id: f.id, name: f.name, size: f.size })),
                folders: folders.map((f: any) => ({ id: f.id, name: f.name }))
            });
        } catch (e: any) {
            return JSON.stringify({ error: e.message });
        }
    }

    if (call.name === 'fs_read_file') {
        try {
            const fileId = call.arguments?.fileId;
            const file = await fileRepository.findById(fileId);

            if (file && file.userId === userId) {
                // Return content directly if text, or JSON if metadata needed. 
                // For preview consistency, let's wrap in JSON but keep content accessible.
                return JSON.stringify({
                    id: file.id,
                    name: file.name,
                    content: file.content || "(Empty file)",
                    size: file.size,
                    mimeType: file.mimeType,
                    url: `/api/files/${file.id}/download`
                });
            } else {
                return JSON.stringify({ error: "File not found or unauthorized." });
            }
        } catch (e: any) {
            return JSON.stringify({ error: e.message });
        }
    }

    if (call.name === 'fs_create_file') {
        try {
            const { name, folderId, content } = call.arguments;
            const newFile = await createFile(name, folderId);
            if (content) {
                await updateFileContent(newFile.id, content);
            }
            return JSON.stringify({
                message: "File created successfully",
                file: { 
                    id: newFile.id, 
                    name: newFile.name,
                    size: newFile.size,
                    mimeType: newFile.mimeType,
                    url: `/api/files/${newFile.id}/download`,
                    content: content || ""
                }
            });
        } catch (e: any) {
            return JSON.stringify({ error: e.message });
        }
    }

    if (call.name === 'fs_update_file') {
        try {
            const { fileId, content } = call.arguments;
            await updateFileContent(fileId, content);
            return "File updated successfully.";
        } catch (e: any) {
            return "Error updating file: " + e.message;
        }
    }

    if (call.name === 'fs_delete_file') {
        try {
            const { fileId } = call.arguments;
            await deleteFile(fileId);
            return "File deleted successfully.";
        } catch (e: any) {
            return "Error deleting file: " + e.message;
        }
    }

    return null;
}
