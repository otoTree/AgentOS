import { z } from 'zod';
import * as fs from 'fs/promises';

export type Tool = {
    name: string;
    description: string;
    parameters: z.ZodType<any>;
    jsonSchema?: object;
    execute: (args: any) => Promise<any>;
}

export const localFileTools: Tool[] = [
    {
        name: "fs_list_directory",
        description: "List files and directories in a given path",
        parameters: z.object({
            path: z.string().describe("The absolute path to the directory")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the directory" }
            },
            required: ["path"]
        },
        execute: async ({ path: dirPath }) => {
            try {
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                return files.map(dirent => ({
                    name: dirent.name,
                    isDirectory: dirent.isDirectory(),
                    isFile: dirent.isFile()
                }));
            } catch (error: any) {
                throw new Error(`Failed to list directory: ${error.message}`);
            }
        }
    },
    {
        name: "fs_read_file",
        description: "Read the content of a file",
        parameters: z.object({
            path: z.string().describe("The absolute path to the file"),
            encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8').describe("The encoding to use (default: utf-8)")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the file" },
                encoding: { type: "string", enum: ["utf-8", "base64"], description: "The encoding to use (default: utf-8)", default: "utf-8" }
            },
            required: ["path"]
        },
        execute: async ({ path: filePath, encoding }) => {
            try {
                const content = await fs.readFile(filePath, { encoding: encoding as BufferEncoding });
                return content;
            } catch (error: any) {
                throw new Error(`Failed to read file: ${error.message}`);
            }
        }
    },
    {
        name: "fs_write_file",
        description: "Write content to a file",
        parameters: z.object({
            path: z.string().describe("The absolute path to the file"),
            content: z.string().describe("The content to write"),
            encoding: z.enum(['utf-8', 'base64']).optional().default('utf-8').describe("The encoding of the content (default: utf-8)")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the file" },
                content: { type: "string", description: "The content to write" },
                encoding: { type: "string", enum: ["utf-8", "base64"], description: "The encoding of the content (default: utf-8)", default: "utf-8" }
            },
            required: ["path", "content"]
        },
        execute: async ({ path: filePath, content, encoding }) => {
            try {
                await fs.writeFile(filePath, content, { encoding: encoding as BufferEncoding });
                return { success: true, path: filePath };
            } catch (error: any) {
                throw new Error(`Failed to write file: ${error.message}`);
            }
        }
    },
    {
        name: "fs_delete_file",
        description: "Delete a file or directory",
        parameters: z.object({
            path: z.string().describe("The absolute path to the file or directory"),
            recursive: z.boolean().optional().default(false).describe("Whether to delete recursively (for directories)")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the file or directory" },
                recursive: { type: "boolean", description: "Whether to delete recursively (for directories)", default: false }
            },
            required: ["path"]
        },
        execute: async ({ path: filePath, recursive }) => {
            try {
                await fs.rm(filePath, { recursive, force: true });
                return { success: true, path: filePath };
            } catch (error: any) {
                throw new Error(`Failed to delete file: ${error.message}`);
            }
        }
    },
    {
        name: "fs_create_directory",
        description: "Create a directory",
        parameters: z.object({
            path: z.string().describe("The absolute path to the directory"),
            recursive: z.boolean().optional().default(true).describe("Whether to create parent directories")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the directory" },
                recursive: { type: "boolean", description: "Whether to create parent directories", default: true }
            },
            required: ["path"]
        },
        execute: async ({ path: dirPath, recursive }) => {
            try {
                await fs.mkdir(dirPath, { recursive });
                return { success: true, path: dirPath };
            } catch (error: any) {
                throw new Error(`Failed to create directory: ${error.message}`);
            }
        }
    },
    {
        name: "fs_move_file",
        description: "Move or rename a file or directory",
        parameters: z.object({
            source: z.string().describe("The source path"),
            destination: z.string().describe("The destination path")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                source: { type: "string", description: "The source path" },
                destination: { type: "string", description: "The destination path" }
            },
            required: ["source", "destination"]
        },
        execute: async ({ source, destination }) => {
            try {
                await fs.rename(source, destination);
                return { success: true, source, destination };
            } catch (error: any) {
                throw new Error(`Failed to move file: ${error.message}`);
            }
        }
    },
    {
        name: "fs_file_info",
        description: "Get information about a file or directory",
        parameters: z.object({
            path: z.string().describe("The absolute path to the file or directory")
        }),
        jsonSchema: {
            type: "object",
            properties: {
                path: { type: "string", description: "The absolute path to the file or directory" }
            },
            required: ["path"]
        },
        execute: async ({ path: filePath }) => {
            try {
                const stats = await fs.stat(filePath);
                return {
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    accessed: stats.atime
                };
            } catch (error: any) {
                throw new Error(`Failed to get file info: ${error.message}`);
            }
        }
    }
];

export const fileTools = localFileTools;
