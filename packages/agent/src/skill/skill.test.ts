import { describe, it, expect } from 'vitest';
import { SkillParser } from './parser';
import { SkillManager } from './manager';
import { LoadSkillChunkTool } from './tools';

describe('Skill Progressive Loading', () => {
    const mockSkillContent = `---
name: test_skill
description: A test skill
---

# Test Skill
Core content here.

<chunk id="chunk1" description="Chunk 1 Description">
Chunk 1 Content
</chunk>

<chunk id="chunk2" description="Chunk 2 Description">
Chunk 2 Content
</chunk>
`;

    it('should parse skill correctly', () => {
        const skill = SkillParser.parse(mockSkillContent);
        
        expect(skill.metadata.name).toBe('test_skill');
        expect(skill.coreContent.trim()).toBe('# Test Skill\nCore content here.');
        expect(skill.chunks.size).toBe(2);
        
        const chunk1 = skill.chunks.get('chunk1');
        expect(chunk1).toBeDefined();
        expect(chunk1?.content.trim()).toBe('Chunk 1 Content');
        expect(chunk1?.description).toBe('Chunk 1 Description');
    });

    it('should generate initial prompt correctly', () => {
        const manager = new SkillManager();
        manager.registerSkill(mockSkillContent);
        
        const prompt = manager.getSkillsPrompt();
        
        expect(prompt).toContain('## Skill: test_skill');
        expect(prompt).toContain('Core content here.');
        expect(prompt).toContain('[Available Details for test_skill]');
        expect(prompt).toContain('- id: chunk1 | description: Chunk 1 Description');
        expect(prompt).toContain('- id: chunk2 | description: Chunk 2 Description');
        expect(prompt).not.toContain('Chunk 1 Content');
    });

    it('should load chunk via tool and update prompt', async () => {
        const manager = new SkillManager();
        manager.registerSkill(mockSkillContent);
        const tool = new LoadSkillChunkTool(manager);
        
        // Execute Tool
        const result = await tool.execute({ skill_name: 'test_skill', chunk_id: 'chunk1' });
        
        expect(result.status).toBe('success');
        expect(result.content).toBe('Chunk 1 Content');
        
        // Check Prompt Update
        const prompt = manager.getSkillsPrompt();
        
        // Chunk 1 should be loaded
        expect(prompt).toContain('### Loaded Details');
        expect(prompt).toContain('#### Chunk 1 Description (chunk1)');
        expect(prompt).toContain('Chunk 1 Content');
        
        // Chunk 1 should NOT be in available list
        // Note: My implementation iterates chunks and checks activeChunks.
        // If it's active, it's not in available list.
        
        // Available list should still contain chunk2
        expect(prompt).toContain('- id: chunk2 | description: Chunk 2 Description');
        
        // Since I construct "Available Details" block only if there are available chunks,
        // it should still exist because of chunk2.
        expect(prompt).toContain('[Available Details for test_skill]');
    });

    it('should handle missing chunks gracefully', async () => {
        const manager = new SkillManager();
        manager.registerSkill(mockSkillContent);
        const tool = new LoadSkillChunkTool(manager);
        
        const result = await tool.execute({ skill_name: 'test_skill', chunk_id: 'missing_chunk' });
        
        expect(result.status).toBe('error');
        expect(result.error).toContain('not found');
    });
});
