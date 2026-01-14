import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Users & Auth ---

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// --- RBAC & Teams ---

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  parent: one(teams, {
    fields: [teams.parentId],
    references: [teams.id],
    relationName: 'team_hierarchy',
  }),
  subTeams: many(teams, {
    relationName: 'team_hierarchy',
  }),
  members: many(teamMembers),
  roles: many(roles),
  files: many(files),
  skills: many(skills),
}));

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id), // Null for system roles
  name: text('name').notNull(),
  description: text('description'),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rolesRelations = relations(roles, ({ one, many }) => ({
  team: one(teams, {
    fields: [roles.teamId],
    references: [teams.id],
  }),
  members: many(teamMembers),
}));

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [teamMembers.roleId],
    references: [roles.id],
  }),
}));

// --- Model Configuration ---

export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // e.g. "OpenAI", "Ollama"
  type: text('type').notNull(), // e.g. "openai", "anthropic", "local"
  config: jsonb('config').notNull(), // encrypted config
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiProvidersRelations = relations(aiProviders, ({ many }) => ({
  models: many(aiModels),
}));

export const aiModels = pgTable('ai_models', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').notNull().references(() => aiProviders.id),
  name: text('name').notNull(), // e.g. "gpt-4"
  displayName: text('display_name'),
  capabilities: jsonb('capabilities').$type<string[]>(), // e.g. ["chat", "vision"]
  contextWindow: integer('context_window'),
  isActive: boolean('is_active').default(true).notNull(),
});

export const aiModelsRelations = relations(aiModels, ({ one }) => ({
  provider: one(aiProviders, {
    fields: [aiModels.providerId],
    references: [aiProviders.id],
  }),
}));

// --- File System ---

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  type: text('type').notNull(),
  extension: text('extension'),
  bucket: text('bucket').notNull(),
  path: text('path').notNull(),
  hash: text('hash'),
  folderId: uuid('folder_id').references(() => folders.id),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const filesRelations = relations(files, ({ one, many }) => ({
  team: one(teams, {
    fields: [files.teamId],
    references: [teams.id],
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  folder: one(folders, {
    fields: [files.folderId],
    references: [folders.id],
  }),
  permissions: many(datasetPermissions),
  shares: many(fileShares),
}));

export const folders = pgTable('folders', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  parentId: uuid('parent_id'), // Self-reference handled in relations? Drizzle needs explicit relation config
  teamId: uuid('team_id').references(() => teams.id),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
    relationName: 'folder_parent',
  }),
  children: many(folders, {
    relationName: 'folder_parent',
  }),
  files: many(files),
  permissions: many(datasetPermissions),
  team: one(teams, {
    fields: [folders.teamId],
    references: [teams.id],
  }),
  owner: one(users, {
    fields: [folders.ownerId],
    references: [users.id],
  }),
}));

export const datasetPermissions = pgTable('dataset_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').references(() => files.id),
  folderId: uuid('folder_id').references(() => folders.id),
  teamId: uuid('team_id').references(() => teams.id),
  userId: uuid('user_id').references(() => users.id),
  permission: text('permission').notNull(), // 'read', 'write'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const datasetPermissionsRelations = relations(datasetPermissions, ({ one }) => ({
  file: one(files, {
    fields: [datasetPermissions.fileId],
    references: [files.id],
  }),
  folder: one(folders, {
    fields: [datasetPermissions.folderId],
    references: [folders.id],
  }),
  team: one(teams, {
    fields: [datasetPermissions.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [datasetPermissions.userId],
    references: [users.id],
  }),
}));

export const fileShares = pgTable('file_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  isPasswordProtected: boolean('is_password_protected').default(false).notNull(),
  password: text('password'),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
});

export const fileSharesRelations = relations(fileShares, ({ one }) => ({
  file: one(files, {
    fields: [fileShares.fileId],
    references: [files.id],
  }),
  creator: one(users, {
    fields: [fileShares.createdBy],
    references: [users.id],
  }),
}));

// --- System Settings ---

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  key: text('key').notNull().unique(),
  name: text('name'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// --- Skills (Workbench) ---

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  
  // Basic Info
  name: text('name').notNull(),
  description: text('description'),
  emoji: text('emoji'),
  
  // Storage
  ossPath: text('oss_path').notNull(), // e.g., skills/{id}/v1/
  version: text('version').default('1.0.0').notNull(),
  
  // Metadata Cache (for quick access without reading OSS)
  inputSchema: jsonb('input_schema'), 
  outputSchema: jsonb('output_schema'),
  
  // Permissions & Status
  isPublished: boolean('is_published').default(false), // Deprecated in favor of publicDeployedAt? Or kept for flag.
  isPublic: boolean('is_public').default(false), // Visible in market
  
  // Deployment Status
  privateDeployedAt: timestamp('private_deployed_at'),
  publicDeployedAt: timestamp('public_deployed_at'),
  
  // Ownership
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const skillsRelations = relations(skills, ({ one, many }) => ({
  team: one(teams, {
    fields: [skills.teamId],
    references: [teams.id],
  }),
  owner: one(users, {
    fields: [skills.ownerId],
    references: [users.id],
  }),
  deployments: many(deployments),
}));

export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(), // Acts as sandboxId
  skillId: uuid('skill_id').references(() => skills.id).notNull(),
  type: text('type').notNull(), // 'private' | 'public'
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'failed', 'stopped'
  url: text('url'), // Optional public URL
  version: text('version'), // Snapshot of version at deployment
  config: jsonb('config'), // Any env vars or config used
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  skill: one(skills, {
    fields: [deployments.skillId],
    references: [skills.id],
  }),
}));

// --- Chat History ---

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull().default('New Chat'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'), // Store tool usage info
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// --- Workflow Engine ---

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  graph: jsonb('graph').notNull(), // { nodes: [], edges: [] }
  triggers: jsonb('triggers'), // { cron: [], event: [] }
  isPublished: boolean('is_published').default(false),
  creatorId: uuid('creator_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  team: one(teams, {
    fields: [workflows.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [workflows.creatorId],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed', 'paused', 'cancelled'
  input: jsonb('input'),
  output: jsonb('output'),
  context: jsonb('context'),
  error: text('error'),
  triggerType: text('trigger_type'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const workflowExecutionsRelations = relations(workflowExecutions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowExecutions.workflowId],
    references: [workflows.id],
  }),
  nodeExecutions: many(workflowNodeExecutions),
}));

export const workflowNodeExecutions = pgTable('workflow_node_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id).notNull(),
  nodeId: text('node_id').notNull(),
  nodeType: text('node_type').notNull(),
  status: text('status').notNull(),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'),
});

export const workflowNodeExecutionsRelations = relations(workflowNodeExecutions, ({ one }) => ({
  execution: one(workflowExecutions, {
    fields: [workflowNodeExecutions.executionId],
    references: [workflowExecutions.id],
  }),
}));

// --- Execution Engine (Tasks) ---

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  type: text('type').notNull(), // 'agent' | 'pipeline'
  instruction: text('instruction'),
  status: text('status').notNull().default('queued'), // 'queued', 'processing', 'completed', 'failed'
  result: text('result'),
  error: text('error'),
  
  // Smart Agent Mode
  agentProfile: jsonb('agent_profile'), // { name, role, goal, tone }
  skillIds: jsonb('skill_ids'), // string[]
  
  // Pipeline Mode
  pipelineDefinition: jsonb('pipeline_definition'), // { steps: [...], inputs: [...] }
  pipelineContext: jsonb('pipeline_context'), // Runtime state
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  team: one(teams, {
    fields: [tasks.teamId],
    references: [teams.id],
  }),
  artifacts: many(taskArtifacts),
}));

export const taskArtifacts = pgTable('task_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id).notNull(),
  type: text('type').notNull(), // 'file', 'code', 'link'
  name: text('name').notNull(),
  url: text('url').notNull(),
  size: integer('size'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskArtifactsRelations = relations(taskArtifacts, ({ one }) => ({
  task: one(tasks, {
    fields: [taskArtifacts.taskId],
    references: [tasks.id],
  }),
}));
