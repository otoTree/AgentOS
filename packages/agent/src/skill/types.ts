export type SkillMetadata = {
  name: string;
  version: string;
  description: string;
  [key: string]: any;
}

export type SkillChunk = {
  id: string;
  description: string;
  content: string;
}

export type Skill = {
  metadata: SkillMetadata;
  coreContent: string; // The content after removing chunks
  chunks: Map<string, SkillChunk>;
  activeChunks: Set<string>; // IDs of chunks that have been loaded
}
