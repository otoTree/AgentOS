# 工作台 (Workbench) 功能设计文档

## 1. 概述
工作台是 AgentOS 的核心组件，定位为**AI 驱动的代码生成与技能构建平台**。
它不仅仅是一个代码编辑器，更是一个通过自然语言交互来构建、测试和部署“技能 (Skill)”的智能环境。

本设计旨在实现以下目标：
1.  **AI 驱动开发 (AI-Native Dev)**：用户通过自然语言描述需求，Agent 自动生成完整代码结构和测试用例。
2.  **统一技能模型 (Unified Skill Model)**：无论是简单的工具函数，还是复杂的多文件业务逻辑，统一抽象为“技能 (Skill)”。
3.  **OSS 存储与版本管理**：代码文件存储在对象存储 (OSS) 中，通过 `meta.json` 描述文件结构和元数据，实现与执行环境的解耦。
4.  **严格的权限模型**：确保技能的安全性和所有权归属。
5.  **统一环境管理**：**依赖包 (pip packages) 和运行时环境由 Root 管理员统一管控，普通用户不可随意安装依赖。**

## 2. 核心概念：技能 (Skill)

**定义**：Skill 是一个可执行的代码单元，包含逻辑实现和接口契约。
**存储**：Skill 的元数据（名称、ID、所有者）存储在数据库，而实际的代码文件和配置存储在 OSS 中。

### 2.1 存储结构 (OSS)
每个 Skill 在 OSS 中拥有独立的存储空间，结构如下：
```
skills/
  {skill_id}/
    v1/                 # 版本控制 (可选，初期可仅维护 latest)
      meta.json         # 核心描述文件
      src/              # 源代码目录
        main.py
        utils.py
```

### 2.2 Meta.json 规范
`meta.json` 是 Skill 的自描述文件，指导 Sandbox 和 IDE 如何理解和运行此 Skill。
**注意：`dependencies` 和 `runtime` 不在此文件中定义，因为它们由系统统一管理。**

```json
{
  "id": "uuid",
  "name": "hacker-news-digest",
  "version": "1.0.0",
  "entrypoint": "src/main.py",
  "description": "Fetch and summarize Hacker News top stories",
  
  "files": [
    "src/main.py",
    "src/utils.py"
  ],
  
  "input_schema": {
    "type": "object",
    "properties": {
      "limit": { "type": "integer", "default": 5 }
    }
  },
  
  "output_schema": {
    "type": "object",
    "properties": {
      "summary": { "type": "string" }
    }
  },
  
  "test_cases": [
    {
      "name": "default_run",
      "input": { "limit": 1 },
      "expected_status": "success"
    }
  ]
}
```

## 3. 数据模型设计 (Database Schema)

将在 `packages/service/database/schema.ts` 中新增 `skills` 表。此表主要用于索引、权限控制和快速检索，不存储大段代码。

### 3.1 `skills` 表结构

```typescript
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  
  // 基础信息
  name: text('name').notNull(),
  description: text('description'),
  emoji: text('emoji'),
  
  // 存储引用
  ossPath: text('oss_path').notNull(), // 指向 OSS 中的根目录，如 skills/{id}/v1/
  version: text('version').default('1.0.0').notNull(),
  
  // 缓存的元数据 (用于搜索和列表展示，避免频繁读取 OSS)
  inputSchema: jsonb('input_schema'), 
  outputSchema: jsonb('output_schema'),
  
  // 权限与状态
  isPublished: boolean('is_published').default(false), // 是否在团队内公开
  isPublic: boolean('is_public').default(false),       // 是否全平台公开 (市场)
  
  // 所有权
  ownerId: uuid('owner_id').references(() => users.id).notNull(), // 技能的最终所有者
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.2 权限模型设计

#### A. 技能权限 (Skill Permissions)
遵循“所有权归属于创建者”的原则。

1.  **Owner (创建者)**:
    - 拥有最高权限 (CRUD)。
    - 唯一可以删除 Skill 的人。
    - 可以决定 Skill 的可见性 (Private/Team/Public)。
2.  **Team Admin**:
    - 可以查看团队内的所有 Skill。
    - *不可* 修改或删除归属于个人的 Private Skill。
    - 可以下架违规的 Public/Team Skill。
3.  **Team Member**:
    - 可以使用 (Execute) 团队可见的 Skill。
    - 可以 Fork (复制) 别人的 Skill 成为自己的副本进行修改。
    - *不可* 修改他人的 Skill。

#### B. 环境与依赖权限 (Environment Permissions)
**原则：Root 账户拥有对运行环境的绝对控制权。**

1.  **Root Admin**:
    - **唯一** 可以通过 `/python/packages` 接口安装/卸载 pip 包的角色。
    - 决定 Sandbox 基础镜像和 Python 版本。
    - 维护全局可用的 Python 包白名单。
2.  **Developer (普通用户)**:
    - **不可** 自行安装 pip 包。
    - 只能使用环境中已预装的库 (如 `requests`, `pandas` 等)。
    - 如果 Skill 需要新的依赖，必须向 Root 申请 (线下或工单流程)。

## 4. 交互流程 (Backend & Sandbox)

### 4.1 Skill 执行流程
当用户请求运行一个 Skill 时：
1.  **Service**: 验证用户权限。
2.  **Service**: 读取 `skills` 表获取 `ossPath`。
3.  **Service**: 从 OSS 下载 `meta.json` 及所有 `files` 到本地临时目录 (或直接流式处理)。
4.  **Service**: 
    - 解析 `meta.json` 获取 `entrypoint`。
    - 将代码文件打包或逐个传递给 Sandbox。
    *注意：Sandbox 执行时使用的是预装好的全局环境，不会为每个 Skill 动态安装依赖。*

### 4.2 AI 辅助开发
AI 生成的代码直接写入 OSS，并更新数据库的 `updatedAt`。
**AI 提示词调整**：在生成代码时，Prompt 中需明确告知 AI **“只能使用标准库及以下预装库：[List of pre-installed packages]”**，避免生成无法运行的代码。

## 5. API 接口设计 (Update)

- `GET /api/workbench/skills`: 列表 (DB)。
- `POST /api/workbench/skills`: 创建 (DB + OSS Init)。
- `GET /api/workbench/skills/[id]`: 详情 (DB + OSS meta.json)。
- `PUT /api/workbench/skills/[id]/files`: 更新文件 (OSS Write)。
- `POST /api/workbench/skills/[id]/run`: 执行。

## 6. 实施计划

1.  **Database**: 创建 `skills` 表。
2.  **Storage Service**: 封装 OSS 操作 (Upload/Download/List)。
3.  **Skill Service**: 实现 Skill 的 CRUD，处理 DB 与 OSS 的同步。
4.  **Sandbox Integration**: 实现多文件 Skill 在 Sandbox 中的加载与执行策略。
