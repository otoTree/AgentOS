# 第一阶段：基础设施与核心配置设计 (Foundation Design)

本设计文档对应 Roadmap 第一阶段，涵盖 **模型配置**、**RBAC 权限** 和 **文件系统** 三大核心基础设施。

## 1. 模型配置 (Model Configuration)

**目标**: 建立统一的 AI 模型配置中心，管理不同供应商（OpenAI, Anthropic, Local LLM 等）的 API Key 和参数，为上层应用提供统一的模型调用接口。

### 1.1 数据库设计 (Database Schema)

在 `packages/service/database/schema.ts` 中新增以下表：

#### `ai_providers` (AI 供应商配置)
存储供应商级别的配置，如 API Key, Base URL。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| name | Text | 供应商名称 (e.g., "OpenAI", "Ollama") |
| type | Text | 类型 (openai, azure, anthropic, local) |
| config | JSONB | 加密的配置信息 (apiKey, baseUrl 等) |
| is_active | Boolean | 是否启用 |
| created_at | Timestamp | 创建时间 |

#### `ai_models` (具体模型)
存储具体的模型信息，关联到供应商。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| provider_id | UUID | 外键 -> ai_providers.id |
| name | Text | 模型标识 (e.g., "gpt-4", "llama3") |
| display_name | Text | 显示名称 |
| capabilities | JSONB | 能力标签 (chat, embedding, vision, tool_call) |
| context_window | Integer | 上下文窗口大小 |
| is_active | Boolean | 是否启用 |

### 1.2 核心逻辑

- **配置加密**: 敏感信息 (API Key) 在入库前必须加密 (使用 `packages/service` 中的加密工具)。
- **模型路由**: 提供统一的 `ModelService`，根据请求的模型 ID 自动路由到对应的 Provider 并构建 Client。
- **默认模型**: 系统级默认模型配置 (System Settings)。

---

## 2. RBAC 权限与多租户 (RBAC & Multi-tenancy)

**目标**: 建立基于团队 (Team) 的多租户体系，并实现**动态可扩展**的基于角色 (Role) 的权限控制，支持用户自定义角色。

### 2.1 数据库设计 (Database Schema)

#### `roles` (角色定义)
支持系统预设角色和团队自定义角色。

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| team_id | UUID | 所属团队 (NULL 表示系统全局预设角色) |
| name | Text | 角色名称 (e.g., "Admin", "Dev") |
| description | Text | 描述 |
| permissions | JSONB | 权限列表 (字符串数组, e.g. `["model:read", "file:write"]`) |
| created_at | Timestamp | |

#### `teams` (团队/租户)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| name | Text | 团队名称 |
| owner_id | UUID | 拥有者 ID (外键 -> users.id) |
| created_at | Timestamp | |

#### `team_members` (团队成员)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| team_id | UUID | 外键 -> teams.id |
| user_id | UUID | 外键 -> users.id |
| role_id | UUID | 外键 -> roles.id |
| joined_at | Timestamp | |

### 2.2 权限逻辑

- **权限点 (Permissions)**: 采用 `resource:action` 格式的字符串定义原子权限，例如：
  - `team:update` (更新团队信息)
  - `member:add` (添加成员)
  - `model:create` (创建模型配置)
  - `file:delete` (删除文件)
- **系统预设角色**: 系统初始化时创建默认角色：
  - `Owner`: 拥有 `*` (所有权限)
  - `Admin`: 拥有除 `team:delete` 外的大部分管理权限
  - `Member`: 拥有基础使用权限
- **鉴权流程**:
  1. 获取当前用户在当前 Team 中的 `role_id`。
  2. 查询 `roles` 表获取该角色的 `permissions` 列表。
  3. 检查请求所需的权限是否在列表包含范围内 (支持 `*` 通配符)。

---

## 3. 文件系统 (File System)

**目标**: 建立统一的文件存储和元数据索引，支持 S3 协议，为 RAG 和知识库提供支撑。

### 3.1 数据库设计 (Database Schema)

#### `files` (文件元数据)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键 |
| team_id | UUID | 归属团队 |
| name | Text | 原始文件名 |
| size | Integer | 文件大小 (Bytes) |
| type | Text | MIME 类型 |
| extension | Text | 文件后缀 |
| bucket | Text | 存储桶名称 |
| path | Text | 存储路径/Key |
| hash | Text | 文件哈希 (SHA256, 用于去重) |
| uploaded_by | UUID | 上传者 |
| created_at | Timestamp | |

### 3.2 核心逻辑

- **Storage Interface**: 定义 `IStorageService` 接口，支持 `upload`, `download`, `delete`, `getUrl`。
- **S3 Implementation**: 默认实现基于 S3 (MinIO/AWS S3)。
- **文件处理流水线**:
  1. 上传文件 -> 存储到 S3。
  2. 记录元数据到 `files` 表。
  3. (异步) 触发文本提取和向量化 (为后续 RAG 做准备)。

## 4. 实施计划 (Implementation Plan)

1. **数据库迁移**: 更新 `schema.ts` 并运行 migration。
2. **后端服务**:
   - 实现 `ModelService` (CRUD Provider/Model)。
   - 实现 `TeamService` (CRUD Team/Member)。
   - 实现 `StorageService` (S3 Upload/Download)。
3. **API 开发**:
   - `/api/admin/models`
   - `/api/team/*`
   - `/api/files/upload`
4. **前端对接**:
   - 管理后台增加模型配置页面。
   - 用户中心增加团队切换和成员管理。
