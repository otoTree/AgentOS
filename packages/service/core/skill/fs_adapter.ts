import { SkillFileSystem } from '@agentos/agent';
import { skillService } from './service';

export class ServiceSkillFileSystem implements SkillFileSystem {
    constructor(private skillId: string) {}

    async readFile(path: string): Promise<string> {
        return skillService.getSkillFile(this.skillId, path);
    }

    async writeFile(path: string, content: string): Promise<void> {
        await skillService.updateSkillFiles(this.skillId, {
            [path]: content
        });
    }

    async listFiles(): Promise<string[] | Record<string, any>> {
        const skill = await skillService.getSkill(this.skillId);
        return skill.meta.files;
    }

    async updateMeta(meta: any): Promise<void> {
        await skillService.updateSkillFiles(this.skillId, {}, meta);
    }
}
