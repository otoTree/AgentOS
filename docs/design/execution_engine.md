# Background Task Agent & Execution System 设计文档

## 1. 愿景与范式转变

### 1.1 从 "Workflow Orchestration" 到 "Agentic Delegation"
原有的设计基于传统的 DAG 工作流。在 AgentOS 的新视野下，我们认为 **Skill 本身即是工作流**。

系统不再需要微观管理每个步骤，而是转向 **基于工具调用的任务委派** 模式：
1.  **Super Agent (大脑)**: 
    - 这是一个拥有高级权限的 Agent。
    - 它配备了一个特殊的工具：`create_task`。
    - 通过调用此工具，它可以"雇佣"后台 Worker，并为其设定角色和目标。
    - **批量能力**: Super Agent 可以根据需要多次调用该工具，实现并发任务的批量分发（例如：同时雇佣 5 个"爬虫助手"去抓取不同的网站）。
2.  **Task Agent (执行者)**: 
    - 这是一个**运行时概念**，由 Super Agent 通过工具调用动态创建。
    - 它在后台启动，加载 Super Agent 传入的 Profile 和 Skill，自主完成任务。
3.  **Artifacts (交付物)**: 任务执行过程中产生的代码、文件、图表等，被自动捕获并持久化。

### 1.2 核心目标
- **去 DAG 化**: 移除复杂的图编排引擎。
- **Tool-First Design**: 任务创建只是 Super Agent 的一个普通工具调用，逻辑统一且灵活。
- **交付物管理**: 自动追踪和存储任务产生的文件。

## 2. 核心实体定义

### 2.1 Task (任务)
描述一个待执行的具体工作。
- **Instruction**: 任务指令。
- **Agent Profile**: 动态生成的 Agent 设定。
- **Allowed Skills**: 授权使用的 Skill ID 列表。
- **Status**: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.

### 2.2 Super Agent Tools
Super Agent 默认挂载的核心工具。

#### Tool: `create_task`
用于分发后台任务。
- **Arguments**:
    - `instruction` (string): 具体的任务描述。
    - `agent_profile` (object): { name, role, goal, tone }。
    - `skill_ids` (array<string>): 需要使用的 Skill ID 列表。
- **Returns**: `task_id` (用于后续查询状态).

## 3. 系统架构

```mermaid
graph TD
    User[User] -->|1. Request| Super[Super Agent]
    
    subgraph Super Agent Runtime
        Super -->|2. Reasoning| LLM[LLM]
        LLM -->|3. Tool Call: create_task| ToolRunner
    end
    
    ToolRunner -->|4. Save Task| DB[(Postgres)]
    ToolRunner -->|5. Enqueue| Queue[Job Queue (pg-boss)]
    
    subgraph Execution Environment
        Worker[Task Worker] -->|6. Poll Job| Queue
        Worker -->|7. Init Agent (Apply Profile)| Runtime
        Worker -->|8. Mount Skills| Runtime
        Runtime -->|9. Execute & Reason| Sandbox[Python Sandbox]
        
        Sandbox -->|10. Generate Files| LocalFS[Local File System]
    end
    
    Worker -->|11. Upload Artifacts| OSS[Object Storage]
    Worker -->|12. Update Status| DB
```

### 3.1 调度层 (Dispatcher)
- **Tool-Based Dispatch**:
    - 任务的创建完全依赖于 Super Agent 的 `function calling` 能力。
    - 这意味着 Super Agent 可以通过循环调用 `create_task` 来实现复杂的并发逻辑，或者根据上一个任务的结果来决定是否创建下一个任务。

### 3.2 执行层 (Worker & Sandbox)
- **Dynamic Initialization**:
    - Worker 从数据库读取 Task。
    - 提取 `agent_profile`，构建 System Prompt。
    - 提取 `skill_ids`，仅注入指定的 Skill。
- **Artifact Sniffer**:
    - 监听沙箱 `/workspace/output`，自动上传产出物。

## 4. 数据库设计 (Drizzle Schema)

### 4.1 Tasks 表
记录任务及其动态配置。

```typescript
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  
  // 任务指令
  instruction: text('instruction').notNull(),
  
  // 动态生成的 Agent 画像 (JSON)
  agentProfile: jsonb('agent_profile').notNull(),
  
  // 选定的 Skill IDs (Array)
  skillIds: jsonb('skill_ids').$type<string[]>().notNull(),
  
  // 任务状态
  status: text('status').default('queued').notNull(), 
  
  // 执行结果摘要
  result: text('result'),
  
  // 错误信息
  error: text('error'),
  
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 4.2 TaskArtifacts 表
记录任务产生的具体文件/交付物。

```typescript
export const taskArtifacts = pgTable('task_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id).notNull(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  
  type: text('type').notNull(), 
  name: text('name').notNull(),
  url: text('url').notNull(),
  size: integer('size'),
  mimeType: text('mime_type'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## 5. 交互流程详解

### 场景：批量分析竞争对手

1.  **用户请求**:
    - User: "帮我分析一下这三家公司的官网：ExampleA.com, ExampleB.com, ExampleC.com，分别生成报告。"

2.  **Super Agent 规划**:
    - 识别意图: 需要执行 3 次相同的分析任务。
    - **生成 Profile**: 
        - Role: "Competitor Analyst"
        - Goal: "Analyze website content and generate a brief report."
    - **选择 Skills**: `web_scrape`, `summarize_text`.

3.  **工具调用 (Batch Execution)**:
    - Super Agent 连续发起 3 次 `create_task` 调用（或在一次回复中包含 3 个 tool_call）：
        1.  `create_task(instruction="Analyze ExampleA.com...", profile=..., skills=...)`
        2.  `create_task(instruction="Analyze ExampleB.com...", profile=..., skills=...)`
        3.  `create_task(instruction="Analyze ExampleC.com...", profile=..., skills=...)`

4.  **异步执行**:
    - 系统将 3 个任务推入队列。
    - 3 个后台 Worker 并行领取任务，分别启动沙箱进行抓取和分析。

5.  **结果汇总**:
    - 任务完成后，Super Agent 可以查询这些任务的状态和 Result，最后给用户一个汇总回复："三家公司的分析报告已生成，请查看附件。"

## 6. 开发计划

### 第一阶段：Schema 与 Tool 定义
1.  **Schema**: 创建 `Tasks` 和 `TaskArtifacts` 表。
2.  **Tool Implementation**: 在 `packages/service` 中实现 `CreateTaskTool`，该工具负责向数据库插入记录并发送消息到 `pg-boss`。

### 第二阶段：Super Agent 增强
1.  **System Prompt**: 更新 Super Agent 的提示词，使其知晓自己拥有 "雇佣员工" (create_task) 的能力。
2.  **Context Management**: 让 Super Agent 能够理解任务 ID，并在后续对话中查询任务进度。

### 第三阶段：执行器实现
1.  **Worker**: 实现 `pg-boss` 消费者。
2.  **Runtime**: 动态构建 LangChain/AgentExecutor。
