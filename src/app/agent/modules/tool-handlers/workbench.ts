import { prisma } from "@/lib/infra/prisma";
import { ProjectStorage } from "@/lib/storage/project-storage";

export async function handleWorkbenchTool(call: any, userId: string): Promise<string> {
    const { name, arguments: args } = call;

    try {
        if (name === 'workbench_list_projects') {
            const projects = await prisma.project.findMany({
                where: { userId },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    updatedAt: true,
                    _count: {
                        select: { deployments: true }
                    }
                }
            });
            return JSON.stringify(projects);
        }

        if (name === 'workbench_create_project') {
            const { name: projectName, description } = args;
            
            const project = await prisma.project.create({
                data: {
                    name: projectName,
                    description,
                    userId,
                },
            });
            
            // Create default tool
            const initialCode = `def main():\n    print("Hello from ${projectName}")`;
            const tool = await prisma.tool.create({
                data: {
                    name: "Main Tool",
                    projectId: project.id,
                    code: initialCode,
                    inputs: []
                }
            });
            
            const storageKey = ProjectStorage.getToolKey(userId, project.id, tool.id);
            await ProjectStorage.saveCode(storageKey, initialCode);
            
            await prisma.tool.update({
                where: { id: tool.id },
                data: { storageKey }
            });

            return JSON.stringify({
                id: project.id,
                name: project.name,
                message: "Project created successfully."
            });
        }

        if (name === 'workbench_get_project') {
            const { id } = args;
            const project = await prisma.project.findFirst({
                where: { id, userId },
                include: {
                    tools: {
                        orderBy: { createdAt: 'asc' },
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            code: true,
                            storageKey: true
                        }
                    }
                }
            });
            
            if (!project) return "Project not found.";

            // Fetch code for each tool from S3 if needed
            for (const tool of project.tools) {
                if (tool.storageKey) {
                    try {
                        const s3Code = await ProjectStorage.getCode(tool.storageKey);
                        if (s3Code !== null) {
                            tool.code = s3Code;
                        }
                    } catch (e) {
                        console.error(`Failed to fetch code for tool ${tool.id}`, e);
                    }
                }
            }
            
            return JSON.stringify(project);
        }

        if (name === 'workbench_create_tool') {
            const { projectId, name: toolName, description } = args;
            
            // Verify project ownership
            const project = await prisma.project.findUnique({
                where: { id: projectId, userId }
            });
            
            if (!project) return "Project not found or unauthorized.";

            const initialCode = `def main():\n    print("Hello from ${toolName}")`;
            
            const tool = await prisma.tool.create({
                data: {
                    name: toolName,
                    description,
                    projectId,
                    code: initialCode,
                    inputs: []
                }
            });

            const storageKey = ProjectStorage.getToolKey(userId, projectId, tool.id);
            await ProjectStorage.saveCode(storageKey, initialCode);

            await prisma.tool.update({
                where: { id: tool.id },
                data: { storageKey }
            });

            return JSON.stringify(tool);
        }

        if (name === 'workbench_update_tool_code') {
            const { toolId, code } = args;
            
            const tool = await prisma.tool.findUnique({
                where: { id: toolId },
                include: { project: true }
            });
            
            if (!tool || tool.project.userId !== userId) {
                return "Tool not found or unauthorized.";
            }
            
            let storageKey = tool.storageKey;
            if (!storageKey) {
                storageKey = ProjectStorage.getToolKey(userId, tool.projectId, toolId);
            }
            
            await ProjectStorage.saveCode(storageKey, code);
            
            await prisma.tool.update({
                where: { id: toolId },
                data: { 
                    code,
                    storageKey 
                }
            });
            
            return "Tool code updated successfully.";
        }
        
        if (name === 'workbench_delete_project') {
             const { id } = args;
             // Basic implementation
             const project = await prisma.project.findUnique({
                where: { id, userId }
             });

             if (!project) return "Project not found.";

             await prisma.project.delete({
                 where: { id }
             });
             
             return "Project deleted.";
        }

        return "Unknown workbench tool.";
    } catch (error: any) {
        console.error("Workbench tool error:", error);
        return `Error executing workbench tool: ${error.message}`;
    }
}
