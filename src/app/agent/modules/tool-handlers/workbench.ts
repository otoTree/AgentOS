import { projectRepository } from "@/lib/repositories/project-repository";
import { toolRepository } from "@/lib/repositories/tool-repository";
import { ProjectStorage } from "@/lib/storage/project-storage";

export async function handleWorkbenchTool(call: any, userId: string): Promise<string> {
    const { name, arguments: args } = call;

    try {
        if (name === 'workbench_list_projects') {
            const projects = await projectRepository.findByUserId(userId);
            
            // Note: _count of deployments is expensive to calculate with current Redis setup.
            // We'll skip it for now or we need a specialized counter.
            
            return JSON.stringify(projects);
        }

        if (name === 'workbench_create_project') {
            const { name: projectName, description } = args;
            
            const project = await projectRepository.create({
                name: projectName,
                description,
                userId,
                category: 'Tools' // Default
            });
            
            // Create default tool
            const initialCode = `def main():\n    print("Hello from ${projectName}")`;
            const tool = await toolRepository.create({
                name: "Main Tool",
                projectId: project.id,
                code: initialCode,
                inputs: []
            });
            
            const storageKey = ProjectStorage.getToolKey(userId, project.id, tool.id);
            await ProjectStorage.saveCode(storageKey, initialCode);
            
            await toolRepository.update(tool.id, { storageKey });

            return JSON.stringify({
                id: project.id,
                name: project.name,
                message: "Project created successfully."
            });
        }

        if (name === 'workbench_get_project') {
            const { id } = args;
            const project = await projectRepository.findById(id);
            
            if (!project || project.userId !== userId) return "Project not found.";

            const tools = await toolRepository.findByProjectId(id);
            // Sort tools by createdAt
            const sortedTools = tools.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            // Fetch code for each tool from S3 if needed
            for (const tool of sortedTools) {
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
            
            return JSON.stringify({
                ...project,
                tools: sortedTools
            });
        }

        if (name === 'workbench_create_tool') {
            const { projectId, name: toolName, description } = args;
            
            // Verify project ownership
            const project = await projectRepository.findById(projectId);
            
            if (!project || project.userId !== userId) return "Project not found or unauthorized.";

            const initialCode = `def main():\n    print("Hello from ${toolName}")`;
            
            const tool = await toolRepository.create({
                name: toolName,
                description,
                projectId,
                code: initialCode,
                inputs: []
            });

            const storageKey = ProjectStorage.getToolKey(userId, projectId, tool.id);
            await ProjectStorage.saveCode(storageKey, initialCode);

            await toolRepository.update(tool.id, { storageKey });

            return JSON.stringify(tool);
        }

        if (name === 'workbench_update_tool_code') {
            const { toolId, code } = args;
            
            const tool = await toolRepository.findById(toolId);
            
            if (!tool) return "Tool not found.";
            
            // Verify project ownership
            const project = await projectRepository.findById(tool.projectId);
            if (!project || project.userId !== userId) {
                 return "Tool not found or unauthorized.";
            }
            
            let storageKey = tool.storageKey;
            if (!storageKey) {
                storageKey = ProjectStorage.getToolKey(userId, tool.projectId, toolId);
            }
            
            await ProjectStorage.saveCode(storageKey, code);
            
            await toolRepository.update(toolId, { 
                code,
                storageKey 
            });
            
            return "Tool code updated successfully.";
        }
        
        if (name === 'workbench_delete_project') {
             const { id } = args;
             // Verify ownership
             const project = await projectRepository.findById(id);

             if (!project || project.userId !== userId) return "Project not found.";

             await projectRepository.delete(id);
             
             return "Project deleted.";
        }

        return "Unknown workbench tool.";
    } catch (error: any) {
        console.error("Workbench tool error:", error);
        return `Error executing workbench tool: ${error.message}`;
    }
}
