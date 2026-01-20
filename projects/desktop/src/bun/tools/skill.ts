import { z } from 'zod';
import { SkillRegistry } from '../service/skill';
import { SandboxService } from '../service/sandbox';
import { Tool } from './file';

export function createSkillTools(skillRegistry: SkillRegistry, sandboxService: SandboxService): Tool[] {
    return [
        {
            name: "skill_list_available",
            description: "List all available skills and their metadata from the local registry.",
            parameters: z.object({}),
            jsonSchema: {
                type: "object",
                properties: {},
                required: []
            },
            execute: async () => {
                try {
                    const skills = await skillRegistry.listSkills();
                    return skills.map(s => ({
                        name: s.metadata.name,
                        description: s.metadata.description,
                        version: s.metadata.version,
                        category: s.metadata.category,
                        path: s.executionConfig?.rootPath
                    }));
                } catch (error: any) {
                    throw new Error(`Failed to list skills: ${error.message}`);
                }
            }
        },
        {
            name: "skill_get_details",
            description: "Get full details (metadata, config) for a specific skill by name.",
            parameters: z.object({
                name: z.string().describe("The name of the skill to retrieve")
            }),
            jsonSchema: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the skill to retrieve" }
                },
                required: ["name"]
            },
            execute: async ({ name }) => {
                try {
                    const skills = await skillRegistry.listSkills();
                    const skill = skills.find(s => s.metadata.name === name);
                    if (!skill) {
                        throw new Error(`Skill '${name}' not found.`);
                    }
                    return skill;
                } catch (error: any) {
                    throw new Error(`Failed to get skill details: ${error.message}`);
                }
            }
        },
        {
            name: "skill_execute_script_file",
            description: "Execute a local script file in the sandbox environment. The file will be copied to a temporary directory and executed.",
            parameters: z.object({
                path: z.string().describe("The absolute path to the script file to execute"),
                language: z.enum(['python', 'javascript', 'bash']).optional().describe("The programming language. If omitted, inferred from file extension.")
            }),
            jsonSchema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "The absolute path to the script file" },
                    language: { type: "string", enum: ["python", "javascript", "bash"], description: "The programming language" }
                },
                required: ["path"]
            },
            execute: async ({ path: scriptPath, language }) => {
                try {
                    return await sandboxService.runScriptFile(scriptPath, language);
                } catch (error: any) {
                    throw new Error(`Failed to execute script file: ${error.message}`);
                }
            }
        }
    ];
}
