import { LLMClient } from '@agentos/superagent';
import { SkillFileSystem } from './interfaces';
import { SKILL_GEN_STRUCTURE_PROMPT, SKILL_GEN_CODE_PROMPT } from './prompts';

export interface SkillStructure {
    name: string;
    description: string;
    entrypoint: string;
    files: string[];
    input_schema: any;
    output_schema: any;
    explanation: string;
}

export class CoderSkillGenerator {

    private renderPrompt(template: string, vars: Record<string, string>): string {
        let content = template;
        for (const [key, val] of Object.entries(vars)) {
            content = content.split(`{{${key}}}`).join(val || '');
        }
        return content;
    }

    async generate(params: {
        request: string,
        dependencies: string,
        llmClient: LLMClient,
        fileSystem: SkillFileSystem
    }): Promise<SkillStructure> {
        const { request, dependencies, llmClient, fileSystem } = params;

        // 1. Generate Structure
        const structurePrompt = this.renderPrompt(SKILL_GEN_STRUCTURE_PROMPT, {
            request,
            dependencies
        });

        const structureJsonRes = await llmClient.chat([
            { role: 'system', content: 'You are a JSON generator.' },
            { role: 'user', content: structurePrompt }
        ]);

        let structure: SkillStructure;
        const structureContent = structureJsonRes.content || '';
        
        try {
            // Clean markdown if present
            const cleanJson = structureContent.replace(/```json\n?|\n?```/g, '');
            structure = JSON.parse(cleanJson);
        } catch (e) {
            throw new Error('Failed to parse AI response as JSON: ' + structureContent);
        }

        // 2. Generate Code for each file
        for (const filename of structure.files) {
            const codePrompt = this.renderPrompt(SKILL_GEN_CODE_PROMPT, {
                name: structure.name,
                filename,
                context: request,
                dependencies
            });

            const codeRes = await llmClient.chat([
                { role: 'system', content: 'You are a Python expert.' },
                { role: 'user', content: codePrompt }
            ]);

            const codeContent = codeRes.content || '';
            // Clean markdown
            const code = codeContent.replace(/```python\n?|\n?```/g, '');

            // 3. Write File
            await fileSystem.writeFile(filename, code);
        }

        return structure;
    }
}
