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

// --- System Settings ---

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

