export type SkillExecutionConfig = {
  rootPath?: string;      // 本地绝对路径
  env?: Record<string, string>;
  dependencies?: string[];
};

export type SkillCloudConfig = {
  skillId?: string;       // 云端 ID (仅当已发布时存在)
  version?: string;
  isPublic: boolean;      // 关键字段：是否公开
  syncStatus: 'synced' | 'modified' | 'local-only';
  lastSyncedAt?: Date;
};

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
  
  // 运行时配置
  executionConfig?: SkillExecutionConfig;
  
  // 云端同步状态
  cloudConfig?: SkillCloudConfig; 
}
