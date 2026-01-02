import { modelService } from '../ai/service';
import { promptFactory, updateSandboxDependencies } from '../prompt/factory';
import { skillService } from './service';
import { sandboxClient } from '../sandbox/client';

export class SkillGenerator {
    
    /**
     * Helper to sync dependencies before generating prompts
     */
    private async syncDependencies() {
        try {
            const deps = await sandboxClient.getPackageSpecifiers();
            // We use simple names for prompts to save tokens, or full specifiers if version matters.
            // Based on previous code, let's use names but maybe we want versions?
            // The prompt says "pre-installed packages ({{dependencies}})".
            // Let's use the names for brevity as originally designed.
            const depNames = await sandboxClient.getPackageNamesString();
            if (depNames) {
                updateSandboxDependencies(depNames.split(', '));
            }
        } catch (e) {
            console.warn('Failed to sync sandbox dependencies, using defaults:', e);
        }
    }

    /**
     * Generate a new Skill from scratch
     */
    async generateSkill(params: {
        teamId: string,
        ownerId: string,
        modelId: string,
        request: string
    }) {
        // 0. Sync Dependencies
        await this.syncDependencies();

        // 1. Generate Structure
        const structurePrompt = promptFactory.getPrompt('SKILL_GEN_STRUCTURE', { request: params.request });
        
        const structureJson = await modelService.chat(params.modelId, [
            { role: 'system', content: 'You are a JSON generator.' },
            { role: 'user', content: structurePrompt }
        ]);
        
        let structure;
        try {
            // Clean markdown if present
            const cleanJson = structureJson.replace(/```json\n?|\n?```/g, '');
            structure = JSON.parse(cleanJson);
        } catch (e) {
            throw new Error('Failed to parse AI response as JSON: ' + structureJson);
        }
        
        // 2. Create Skill (DB + Meta)
        const skill = await skillService.createSkill({
            teamId: params.teamId,
            ownerId: params.ownerId,
            name: structure.name,
            description: structure.description,
            isPublic: false
        });
        
        // 3. Generate Code for each file
        const files: Record<string, string> = {};
        
        for (const filename of structure.files) {
            const codePrompt = promptFactory.getPrompt('SKILL_GEN_CODE', {
                name: structure.name,
                filename,
                context: params.request
            });
            
            const code = await modelService.chat(params.modelId, [
                { role: 'system', content: 'You are a Python expert.' },
                { role: 'user', content: codePrompt }
            ]);
            
            // Clean markdown
            files[filename] = code.replace(/```python\n?|\n?```/g, '');
        }
        
        // 4. Update Skill Files
        await skillService.updateSkillFiles(skill.id, files, {
            input_schema: structure.input_schema,
            output_schema: structure.output_schema,
            // files list is implicitly updated by meta.json save in service? 
            // skillService.updateSkillFiles actually merges meta updates.
            // We should ensure `files` in meta is correct.
            files: structure.files,
            entrypoint: structure.entrypoint
        });
        
        return {
            skillId: skill.id,
            explanation: structure.explanation
        };
    }

    /**
     * Refine Skill based on instructions or error
     */
    async refineSkill(params: {
        skillId: string,
        modelId: string,
        instruction?: string,
        errorLog?: string
    }) {
        // 0. Sync Dependencies (might be needed for refinement too)
        await this.syncDependencies();

        const skill = await skillService.getSkill(params.skillId);
        const meta = skill.meta;
        
        // Let's focus on the entrypoint for refinement
        const targetFile = meta.entry || meta.entrypoint;
        if (!targetFile) {
            throw new Error('Skill entrypoint not found in metadata');
        }

        const currentCode = await skillService.getSkillFile(params.skillId, targetFile);

        let promptName = 'SKILL_GEN_CODE';
        let variables: any = {
            name: skill.name,
            filename: targetFile,
            context: params.instruction || 'Refine the code.'
        };

        if (params.errorLog) {
            promptName = 'SKILL_REFINE_ERROR';
            variables = {
                name: skill.name,
                filename: targetFile,
                code: currentCode,
                error: params.errorLog
            };
        } else if (params.instruction) {
            // We can use a dedicated REFINE prompt if available, 
            // but for now let's reuse GEN_CODE with instruction as context
            variables.context = `Current Code:\n${currentCode}\n\nInstruction: ${params.instruction}`;
        }

        const prompt = promptFactory.getPrompt(promptName as any, variables);
        
        const response = await modelService.chat(params.modelId, [
            { role: 'system', content: 'You are a Python expert.' },
            { role: 'user', content: prompt }
        ]);
        
        const cleanCode = response.replace(/```python\n?|\n?```/g, '');
        
        // Update the file
        await skillService.updateSkillFiles(params.skillId, {
            [targetFile]: cleanCode
        });
        
        return {
            filename: targetFile,
            code: cleanCode
        };
    }
}

export const skillGenerator = new SkillGenerator();
