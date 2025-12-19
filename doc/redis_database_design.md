# Redis Database Architecture Design

## 1. Overview
This document outlines the architectural design for migrating AgentOS's database from PostgreSQL to Redis. The primary goal is to support high concurrency and low latency while maintaining data persistence. Redis will be used as the primary data store (User Profile Store, Session Store, Object Store, and Event Store).

## 2. Core Principles
- **Data Structure Mapping**: Relational tables are mapped to Redis Hashes, Sets, Sorted Sets, and Lists.
- **Denormalization**: Some data redundancy is accepted to reduce lookups and join complexity.
- **Indexing**: Manual secondary indices are maintained using Sets and Sorted Sets.
- **Persistence**: Hybrid approach using AOF (Append Only File) for durability and RDB for backups.

## 3. Key Naming Convention
We adhere to a strict namespacing convention to simulate tables and relationships:
- **Entity**: `entity:{id}` (Hash) - Stores the object attributes.
- **Relation (One-to-Many)**: `entity:{id}:{child_entity}s` (Set/List/ZSet) - Stores IDs of related children.
- **Index**: `idx:{entity}:{field}:{value}` (String) - Stores ID for lookup.
- **Global ID**: `global:nextId:{entity}` (Integer) - If not using UUIDs (though we recommend sticking to CUIDs/UUIDs).

## 4. Schema Design

### 4.1 Authentication & User
**User**
- **Key**: `user:{id}`
- **Type**: `Hash`
- **Fields**: `id`, `name`, `email`, `password`, `credits`, `storageLimit`, `openaiApiKey`, etc.
- **Indices**:
  - `idx:user:email:{email}` -> `{id}`
  - `idx:user:username:{username}` -> `{id}`

**Session**
- **Key**: `session:{sessionToken}`
- **Type**: `Hash`
- **Fields**: `id`, `userId`, `expires`
- **Lookup**: `user:{id}:sessions` -> `Set` of `{sessionToken}`

**VerificationToken**
- **Key**: `verification_token:{identifier}:{token}`
- **Type**: `String` (Value: timestamp or empty, set TTL)

### 4.2 Project & Tools
**Project**
- **Key**: `project:{id}`
- **Type**: `Hash`
- **Fields**: `name`, `description`, `userId`, `config`, `createdAt`
- **Relationships**:
  - `user:{id}:projects` -> `Set` of `{projectId}`
  - `project:{id}:tools` -> `Set` of `{toolId}`

**Tool**
- **Key**: `tool:{id}`
- **Type**: `Hash`
- **Fields**: `name`, `code`, `projectId`, `inputs`
- **Relationships**:
  - `project:{id}:tools` -> `Set` of `{toolId}`

### 4.3 File System (Tree Structure)
**Folder**
- **Key**: `folder:{id}`
- **Type**: `Hash`
- **Fields**: `name`, `parentId`, `userId`
- **Relationships**:
  - `folder:{id}:children` -> `Set` of `{folderId}` (Sub-folders)
  - `folder:{id}:files` -> `Set` of `{fileId}` (Files in this folder)
  - `user:{id}:root_folders` -> `Set` of `{folderId}` (Top-level folders)

**File**
- **Key**: `file:{id}`
- **Type**: `Hash`
- **Fields**: `name`, `size`, `s3Key`, `mimeType`, `folderId`, `userId`
- **Indices**:
  - `idx:file:s3Key:{s3Key}` -> `{id}`

### 4.4 Agent Chat (High Throughput)
**AgentConversation**
- **Key**: `conversation:{id}`
- **Type**: `Hash`
- **Fields**: `title`, `userId`, `browserSessionId`, `updatedAt`
- **Relationships**:
  - `user:{id}:conversations` -> `Sorted Set` (Score: `updatedAt` timestamp, Value: `{conversationId}`) - Enables efficient pagination and sorting by recent.

**AgentMessage**
- **Key**: `conversation:{id}:messages`
- **Type**: `List` (or `Sorted Set` if insertion in middle is needed, but List is faster for append-only)
- **Value**: JSON string of the message object `{id, role, content, createdAt}`.
- **Note**: Storing messages as a serialized JSON list inside the conversation key (or a separate list key) avoids creating millions of tiny Hash keys for every message.
- **Optimization**: For very long conversations, split into buckets (e.g., `conversation:{id}:messages:1`, `conversation:{id}:messages:2`).

### 4.5 SOP Workflows (State Management)
**SopWorkflow**
- **Key**: `sop_workflow:{id}`
- **Type**: `Hash`
- **Fields**: `name`, `graph` (JSON string), `userId`

**SopExecution**
- **Key**: `sop_execution:{id}`
- **Type**: `Hash`
- **Fields**: `status`, `context` (JSON), `currentNodeId`, `workflowId`
- **Relationships**:
  - `sop_workflow:{id}:executions` -> `Set` of `{executionId}`

**SopTask**
- **Key**: `sop_task:{id}`
- **Type**: `Hash`
- **Fields**: `status`, `input`, `output`, `executionId`
- **Relationships**:
  - `sop_execution:{id}:tasks` -> `List` of `{taskId}` (Maintains execution order)

## 5. Persistence Strategy
To meet the requirement of "using Redis for persistence":

1.  **AOF (Append Only File)**:
    - **Config**: `appendonly yes`
    - **Sync Policy**: `appendfsync everysec`
    - **Benefit**: Ensures maximum data durability. In the event of a crash, at most 1 second of data is lost.

2.  **RDB (Snapshotting)**:
    - **Config**: Keep default `save` settings (e.g., `save 300 100`).
    - **Benefit**: Faster startup times and compact backups.

## 6. Concurrency & Atomicity
High concurrency requires handling race conditions (e.g., two users editing the same file, or rapid SOP state changes).

1.  **Lua Scripting**:
    - Redis executes Lua scripts atomically.
    - **Use Case**: When moving a file, we need to remove it from `folder A`'s set and add it to `folder B`'s set. A Lua script ensures this happens all at once.
    - **Example**: `eval "redis.call('srem', KEYS[1], ARGV[1]); redis.call('sadd', KEYS[2], ARGV[1])" 2 folder:A:files folder:B:files file:123`

2.  **Transactions (MULTI/EXEC)**:
    - Useful for batching commands but less powerful than Lua for conditional logic.

3.  **Optimistic Locking (WATCH)**:
    - Use `WATCH` on keys if you need to read-modify-write safely without Lua.

## 7. Migration Plan (Postgres -> Redis)
1.  **Double Write**: Modify application to write to both Postgres and Redis.
2.  **Backfill Script**: Iterate through Postgres tables and populate Redis keys using the schema above.
3.  **Switch Read**: Point application reads to Redis.
4.  **Decommission**: Remove Postgres code.

## 8. Technology Stack
- **Client**: `ioredis` (Node.js) - Supports pipelines, transactions, and Lua scripts.
- **ORM-like Layer**: Create a repository pattern or use a lightweight wrapper to handle the serialization/deserialization of Redis Hashes to TypeScript objects.

