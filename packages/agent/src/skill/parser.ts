import { Skill, SkillChunk, SkillMetadata } from './types';

export class SkillParser {
  /**
   * Parse a Markdown file with optional YAML frontmatter and XML chunks
   */
  static parse(fileContent: string): Skill {
    // 1. Extract Frontmatter
    let metadata: SkillMetadata = {
      name: 'unknown',
      version: '0.0.0',
      description: 'No description provided'
    };
    let content = fileContent;

    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
    const match = fileContent.match(frontmatterRegex);

    if (match) {
      try {
        const yamlContent = match[1];
        // Manual YAML parser for simple frontmatter to avoid dependency issues
        const parsed: any = {};
        const lines = yamlContent.split('\n');
        for (const line of lines) {
            // Match key: value
            const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
            if (kvMatch) {
                const key = kvMatch[1].trim();
                let value = kvMatch[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                parsed[key] = value;
            }
        }
        
        if (typeof parsed === 'object' && parsed !== null) {
          metadata = { ...metadata, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to parse frontmatter:', e);
      }
      content = fileContent.replace(frontmatterRegex, '');
    }

    // 2. Extract Chunks
    const chunks = new Map<string, SkillChunk>();
    // Match <chunk id="..." description="...">...</chunk>
    // Using [\s\S]*? for non-greedy multiline match of content
    const chunkRegex = /<chunk\s+id="([^"]+)"\s+description="([^"]+)">([\s\S]*?)<\/chunk>/g;
    
    let matchChunk;
    let coreContent = content;

    // We need to execute regex on the original content (minus frontmatter)
    // and simultaneously remove matched parts from coreContent
    
    // To do this correctly without messing up indices, we can iterate matches and then replace
    // Or just use replace with a callback side-effect
    
    coreContent = content.replace(chunkRegex, (fullMatch, id, description, chunkContent) => {
      chunks.set(id, {
        id,
        description,
        content: chunkContent.trim()
      });
      return ''; // Remove from core content
    });

    // 3. Clean up core content
    coreContent = coreContent.trim();

    return {
      metadata,
      coreContent,
      chunks,
      activeChunks: new Set()
    };
  }
}
