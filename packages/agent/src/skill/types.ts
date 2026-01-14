export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  [key: string]: any;
}

export interface SkillChunk {
  id: string;
  description: string;
  content: string;
}

export interface Skill {
  metadata: SkillMetadata;
  coreContent: string; // The content after removing chunks
  chunks: Map<string, SkillChunk>;
  activeChunks: Set<string>; // IDs of chunks that have been loaded
}
