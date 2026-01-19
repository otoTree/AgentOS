# Server 架构技术规格说明书 (Server Spec)

## 1. 概述 (Overview)

AgentOS Server 是系统的控制平面与模型网关，负责承载 AI 能力、管理技能市场、同步用户配置以及提供协作基础服务。Server 端基于 **NextJS** 构建，采用 **PostgreSQL** 存储业务数据，**OSS** 存储非结构化数据。

## 2. 核心模块 (Core Modules)

### 2.1 AI 模型网关 (AI Model Gateway)
Server 端作为唯一的 AI 能力出口，屏蔽底层模型差异。

*   **API 路径**: `/api/v1/ai`
*   **职责**:
    *   **Unified Interface**: 提供标准化的 Chat (`/chat/completions`) 和 Embedding (`/embeddings`) 接口。
    *   **Credential Management**: 集中管理 API Keys (存储在 `ai_providers.config`，加密)。
    *   **Routing Strategy**: 根据 `ai_models.isActive` 和 `ai_models.capabilities` 路由请求。
*   **数据模型**:
    *   `ai_providers`: 存储供应商配置 (OpenAI, Anthropic 等)。
    *   `ai_models`: 存储具体模型参数 (Context Window, Capabilities)。

### 2.2 技能注册中心 (Skill Registry)
管理 Skill 的全生命周期：创建、版本控制、存储与分发。

*   **API 路径**: `/api/v1/skills`
*   **存储架构**:
    *   **Metadata (DB)**: `skills` 表存储名称、描述、版本、所有者等索引信息。
    *   **Codebase (OSS)**: 代码文件存储在 OSS 的 `skills/{id}/{version}/` 目录下。
        *   `meta.json`: 运行时配置文件。
        *   `SKILL.md`: 语义化说明书 (用于 Prompt Injection)。
        *   `src/`: 源代码。
*   **部署管理**:
    *   `deployments` 表记录 Skill 的运行实例 (Private Sandbox / Public Service)。
    *   支持 `private` (按需启动) 和 `public` (常驻服务) 两种模式。

### 2.3 数据同步与协作 (Sync & Collaboration)
*   **配置同步**: 同步用户的偏好设置、自定义 Prompt 等。
*   **知识库索引**: 接收 Desktop 端上传的文本块，调用 Embedding 模型生成向量并返回（Server 不存储原始内容，只做计算中转）。

## 3. 数据库设计 (Database Schema)

基于 PostgreSQL + Drizzle ORM。

### 3.1 AI 配置
```typescript
// ai_providers
{
  id: uuid,
  name: text, // "OpenAI"
  type: text, // "openai", "anthropic"
  config: jsonb, // Encrypted { apiKey: "..." }
  isActive: boolean
}

// ai_models
{
  id: uuid,
  providerId: uuid,
  name: text, // "gpt-4"
  capabilities: jsonb, // ["chat", "vision"]
  contextWindow: integer
}
```

### 3.2 技能与部署
```typescript
// skills
{
  id: uuid,
  teamId: uuid,
  ownerId: uuid,
  name: text,
  ossPath: text, // "skills/{id}/v1/"
  isPublic: boolean,
  privateDeployedAt: timestamp,
  publicDeployedAt: timestamp
}

// deployments
{
  id: uuid,
  skillId: uuid,
  type: text, // "private" | "public"
  status: text, // "running" | "stopped"
  url: text // Service URL
}
```

## 4. API 接口规范 (API Specification)

### 4.1 AI 接口
*   `POST /api/v1/ai/chat/completions`: 标准 OpenAI 格式兼容接口。
*   `POST /api/v1/ai/embeddings`: 文本向量化接口。
    *   Input: `{ input: string | string[], model: string }`
    *   Output: `{ data: [{ embedding: number[] }], usage: ... }`

### 4.2 Skill 接口
*   `GET /api/v1/skills`: 获取 Skill 列表 (支持 Market/Team 过滤)。
*   `GET /api/v1/skills/{id}`: 获取 Skill 详情 (包含 `meta.json` 内容)。
*   `POST /api/v1/skills/{id}/run`: 触发 Skill 执行 (通过 Sandbox Manager)。

## 5. 服务层逻辑 (Service Layer)

### 5.1 ModelService (`packages/service/core/ai/service.ts`)
*   加载所有 Active 的 Provider 和 Model。
*   `chatComplete(modelId, messages, options)`: 查找 Model -> 获取 Provider Config -> 实例化 Client -> 发起请求。

### 5.2 SkillService (`packages/service/core/skill/service.ts`)
*   `createSkill`: DB 插入记录 -> OSS 初始化目录结构。
*   `getSkillDoc`: 从 OSS 读取 `SKILL.md`。
*   `runSkill`: 结合 `UnifiedSandboxManager`，挂载文件 -> 调用 Sandbox API。

## 6. 安全设计 (Security)
*   **Authentication**: 基于 NextAuth.js 的 Session 验证。
*   **RBAC**: 基于 `teams` 和 `roles` 表的权限控制。
*   **Secret Protection**: API Key 等敏感信息在数据库中加密存储，仅在内存中解密使用。
