# Database Migration Plan: PostgreSQL to Redis

This document outlines the step-by-step plan to migrate the AgentOS application from PostgreSQL (via Prisma) to Redis.

## Phase 0: Foundation & Infrastructure
**Goal**: Establish the base layer for Redis interactions and ensure the development environment is ready.

1.  **Redis Client Enhancement**:
    *   Verify `src/lib/infra/redis.ts` configuration.
    *   Ensure `ioredis` is configured for connection pooling and auto-reconnect.
2.  **DAL (Data Access Layer) Implementation**:
    *   Create a base `RedisRepository` class in `src/lib/core/db/redis-repository.ts`.
    *   Implement common patterns: `findById`, `save`, `delete`, `findMany`.
    *   Implement serialization/deserialization helpers (handling Dates, JSON).
3.  **Migration Scripts**:
    *   Create a CLI script entry point `scripts/migrate-to-redis.ts`.
    *   Setup a mechanism to iterate over existing Prisma models.

## Phase 1: Chat System (High Throughput)
**Goal**: Migrate the most write-intensive part of the application first to gain immediate performance benefits.
**Models**: `AgentConversation`, `AgentMessage`, `ConversationTool`, `ConversationFile`.

1.  **Repository Implementation**:
    *   `ConversationRepository`: Methods for creating conversations, listing user conversations (sorted by date).
    *   `MessageRepository`: Methods for appending messages, fetching message history.
2.  **Service Layer Updates**:
    *   Refactor `src/app/agent/modules/chat.ts` (and related files) to use the new repositories instead of `prisma.agentConversation`.
3.  **Data Migration**:
    *   Script: Fetch all conversations/messages from Postgres.
    *   Action: Pipeline writes to Redis (Hashes for conversations, Lists for messages).
4.  **Verification**:
    *   Verify chat history loads correctly in the UI.
    *   Verify new messages are persisted.

## Phase 2: SOP Engine (Concurrency)
**Goal**: Support high-concurrency state updates for the Agent SOP (Standard Operating Procedure) engine.
**Models**: `SopWorkflow`, `SopExecution`, `SopTask`.

1.  **Repository Implementation**:
    *   `SopWorkflowRepository`: CRUD for workflow definitions.
    *   `SopExecutionRepository`: Atomic state updates (using Lua scripts for status transitions).
    *   `SopTaskRepository`: Task management.
2.  **Service Layer Updates**:
    *   Refactor `src/app/agent/modules/sop-*.ts`.
    *   Replace Prisma transactions with Redis transactions/Lua scripts.
3.  **Data Migration**:
    *   Migrate existing workflows and active executions.

## Phase 3: User & Auth (Core)
**Goal**: Migrate user identities and sessions.
**Models**: `User`, `Account`, `Session`, `VerificationToken`.

1.  **Repository Implementation**:
    *   `UserRepository`: `findByEmail`, `create`, `update`.
    *   `SessionRepository`: Session management (leverage Redis TTL).
2.  **NextAuth Adapter**:
    *   Create a custom NextAuth adapter `src/lib/auth/redis-adapter.ts` or use `@auth/redis-adapter`.
    *   Switch `src/app/api/auth/[...nextauth]/route.ts` to use the new adapter.
3.  **Data Migration**:
    *   Migrate all users and linked accounts.

## Phase 4: Filesystem & Projects (Structure)
**Goal**: Migrate the hierarchical file system and project configurations.
**Models**: `File`, `Folder`, `Project`, `Tool`.

1.  **Repository Implementation**:
    *   `FileSystemRepository`: Handle tree operations (move, delete recursive).
    *   `ProjectRepository`: Project metadata and tool associations.
2.  **Service Layer Updates**:
    *   Refactor `src/app/agent/modules/files.ts` and `src/app/agent/modules/workbench.ts`.
3.  **Data Migration**:
    *   Migrate folder structures and file metadata.
    *   Rebuild parent-child relationships in Redis Sets.

## Phase 5: Cleanup & Switchover
**Goal**: Remove the dependency on PostgreSQL.

1.  **Full Verification**:
    *   Run full regression tests.
    *   Check all UI flows.
2.  **Code Cleanup**:
    *   Remove `prisma` client usage.
    *   Delete `schema.prisma` (archive it).
    *   Remove `pg` dependencies.
3.  **Deployment**:
    *   Update environment variables (remove `DATABASE_URL`).
    *   Ensure Redis persistence config (`appendonly yes`) is active in production.

## Implementation Checklist

- [ ] Setup `RedisRepository` base class.
- [ ] Migrate `User` module.
- [ ] Migrate `Project` module.
- [ ] Migrate `Chat` module.
- [ ] Migrate `Sop` module.
- [ ] Migrate `FileSystem` module.
- [ ] Verify application functionality.
