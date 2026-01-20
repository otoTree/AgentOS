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
            name: "skill_execute_script",
            description: "Execute a code script in the sandbox environment. Useful for testing skill logic or running arbitrary code safely.",
            parameters: z.object({
                code: z.string().describe("The code to execute"),
                language: z.enum(['python', 'javascript', 'bash']).optional().default('python').describe("The programming language (python, javascript, bash)")
            }),
            jsonSchema: {
                type: "object",
                properties: {
                    code: { type: "string", description: "The code to execute" },
                    language: { type: "string", enum: ["python", "javascript", "bash"], description: "The programming language", default: "python" }
                },
                required: ["code"]
            },
            execute: async ({ code, language }) => {
                try {
                    return await sandboxService.runScript(code, language || 'python');
                } catch (error: any) {
                    throw new Error(`Failed to execute script: ${error.message}`);
                }
            }
        }
    ];
}
