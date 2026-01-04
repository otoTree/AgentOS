import { CoderSkillGenerator, CoderAgent } from '@agentos/coder';
import { skillService } from './service';
import { sandboxClient } from '../sandbox/client';
import { ServiceSkillFileSystem } from './fs_adapter';
import { ServiceLLMClient } from './llm_adapter';

export class SkillGenerator {
    
    /**
     * Generate a new Skill from scratch using Coder package
     */
    async generateSkill(params: {
        teamId: string,
        ownerId: string,
        modelId: string,
        request: string
    }) {
        // 0. Sync Dependencies to get available packages string
        let dependencies = "可能没连上sandbox，默认依赖为空";
        try {
            const depNames = await sandboxClient.getPackageNamesString();
            if (depNames) {
                dependencies = depNames;
            }
        } catch (e) {
            console.warn('Failed to sync sandbox dependencies, using defaults:', e);
        }

        // 1. Create a placeholder Skill to establish ID and storage
        // We use a temporary name, it will be updated by the generator
        const skill = await skillService.createSkill({
            teamId: params.teamId,
            ownerId: params.ownerId,
            name: 'Generating Skill...',
            description: 'AI is generating this skill...',
            isPublic: false
        });

        // 2. Initialize Coder Generator
        const fileSystem = new ServiceSkillFileSystem(skill.id);
        const llmClient = new ServiceLLMClient(params.modelId);
        const generator = new CoderSkillGenerator();

        try {
            // 3. Run Generation
            const structure = await generator.generate({
                request: params.request,
                dependencies,
                llmClient,
                fileSystem
            });

            // 4. Update Skill Metadata (Schema, Name, Description)
            // Files are already written by the generator via fileSystem
            
            // Update schemas and entrypoint
            await skillService.updateSkillFiles(skill.id, {}, {
                input_schema: structure.input_schema,
                output_schema: structure.output_schema,
                entrypoint: structure.entrypoint,
                // Ensure all generated files are tracked
                files: structure.files
            });

            // Update Name and Description
            await skillService.updateSkillMeta(skill.id, {
                name: structure.name,
                description: structure.description
            });

            return {
                skillId: skill.id,
                explanation: structure.explanation
            };

        } catch (error) {
            // If generation fails, we might want to clean up or mark as failed
            console.error('Skill generation failed:', error);
            throw error;
        }
    }

    /**
     * Refine Skill based on instructions or error using Coder Agent
     */
    async refineSkill(params: {
        skillId: string,
        modelId: string,
        instruction?: string,
        errorLog?: string
    }) {
        const fileSystem = new ServiceSkillFileSystem(params.skillId);
        const llmClient = new ServiceLLMClient(params.modelId);
        
        const coder = new CoderAgent(fileSystem, llmClient);
        
        let instruction = params.instruction || 'Improve the code.';
        if (params.errorLog) {
            instruction += `\n\nThe previous run failed with error:\n${params.errorLog}\n\nPlease fix the code.`;
        }
        
        const result = await coder.run(instruction);
        
        return {
            filename: result.filename,
            code: result.code,
            explanation: result.explanation
        };
    }
}

export const skillGenerator = new SkillGenerator();
