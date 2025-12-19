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
            
            return "Files:\n" + 
                files.map((f: any) => `- ${f.name} (ID: ${f.id})`).join('\n') +
                "\n\nFolders:\n" +
                folders.map((f: any) => `- ${f.name} (ID: ${f.id})`).join('\n');
        } catch (e: any) {
            return "Error listing files: " + e.message;
        }
    }

    if (call.name === 'fs_read_file') {
        try {
            const fileId = call.arguments?.fileId;
            const file = await fileRepository.findById(fileId);

            if (file && file.userId === userId) {
                return file.content || "(Empty file)";
            } else {
                return "File not found or unauthorized.";
            }
        } catch (e: any) {
            return "Error reading file: " + e.message;
        }
    }

    if (call.name === 'fs_create_file') {
        try {
            const { name, folderId, content } = call.arguments;
            const newFile = await createFile(name, folderId);
            if (content) {
                await updateFileContent(newFile.id, content);
            }
            return `File created: ${newFile.name} (ID: ${newFile.id})`;
        } catch (e: any) {
            return "Error creating file: " + e.message;
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
