# Execution Engine 设计文档

## 1. 背景与目标

根据 AgentOS 路线图，第四阶段和第五阶段的核心目标是实现**自动化与复杂决策引擎**。目前的 AgentOS 主要支持单点 Skill 的执行，缺乏对复杂业务流程的编排和自动化调度能力。

本设计文档旨在定义 **Execution Engine (执行引擎)** 的架构，以支持：
- **异步任务调度 (Async Task Scheduling)**: 支持 Cron 定时任务、事件触发等自动化机制。
- **SOP Agent (标准作业程序 Agent)**: 支持算子并行、多路决策、状态保持，实现复杂业务逻辑的编排。

## 2. 核心概念

为了实现上述目标，引入以下核心实体：

### 2.1 Workflow (工作流)
定义业务逻辑的蓝图。它是一个有向无环图 (DAG)，由节点 (Nodes) 和边 (Edges) 组成。
- **Input**: 工作流启动时需要的初始参数。
- **Output**: 工作流执行结束后的最终结果。

### 2.2 Node (节点)
工作流中的执行单元。类型包括：
- **Start/End**: 流程的开始和结束。
- **Skill Node**: 调用现有的 Skill (Python/Sandboxed)。
- **LLM Node**: 直接调用大模型进行处理。
- **Logic Node**: 逻辑控制，如 `If-Else` (条件分支), `Switch`, `Loop` (循环)。
- **Code Node**: 轻量级 JavaScript/TypeScript 代码块 (用于数据转换)。
- **Human Node**: 需要人工确认或输入的节点 (User-in-the-loop)。

### 2.3 Edge (边)
连接两个节点，定义数据的流向和执行的依赖关系。
- 支持条件表达式 (Condition)，仅当满足条件时才激活后续节点。

### 2.4 Execution (执行实例)
Workflow 的一次运行记录。
- 包含运行时状态、每个节点的输入/输出/日志、执行耗时等。
- 状态: `PENDING`, `RUNNING`, `PAUSED` (等待人工), `COMPLETED`, `FAILED`, `CANCELLED`.

## 3. 系统架构

架构分为三层：**调度层 (Scheduler)**、**编排层 (Orchestrator)** 和 **执行层 (Runner)**。

```mermaid
graph TD
    A[Trigger (Cron/API/Event)] -->|1. Enqueue| B(Job Queue)
    B -->|2. Pick Job| C[Orchestrator / Engine]
    C -->|3. Parse DAG| D{Node Type?}
    D -->|Skill| E[Sandbox Runner]
    D -->|LLM| F[Model Service]
    D -->|Logic| G[Logic Evaluator]
    E & F & G -->|4. Result| C
    C -->|5. Next Node| B
```

### 3.1 调度层 (Scheduler)
负责触发工作流的执行。
- **Cron Scheduler**: 基于时间表达式触发 (如每天 8:00)。
- **Event Listener**: 监听系统事件 (如 webhook, 数据库变更)。
- **API Trigger**: 用户手动触发或通过 API 调用。

**技术选型建议**:
- 鉴于当前架构主要基于 Postgres，推荐使用 **pg-boss** 或 **BullMQ** (需 Redis)。
- *方案 A (推荐)*: **pg-boss**。利用现有的 Postgres 数据库实现作业队列，无需引入 Redis，运维简单。
- *方案 B*: **BullMQ**。高性能，标准方案，但需要额外部署 Redis。

### 3.2 编排层 (Orchestrator)
负责管理 DAG 的生命周期。
- **状态管理**: 跟踪当前执行到哪个节点。
- **并发控制**: 识别可以并行执行的节点分支。
- **数据流转**: 将上一个节点的 Output 映射为下一个节点的 Input。

### 3.3 执行层 (Runner)
具体的任务执行者。
- 复用现有的 `skillService` 执行 Python Skill。
- 新增 `LLMService` 调用。
- 简单的逻辑判断在 Node.js 进程中直接计算。

## 4. 数据库设计 (Schema)

基于 Drizzle ORM 的 Schema 设计草案。

### 4.1 Workflows 表
存储流程定义。

```typescript
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // 核心定义，存储 JSON 结构的 Graph (Nodes & Edges)
  // 包含: nodes: { id, type, data, position }[], edges: { id, source, target, type }[]
  graph: jsonb('graph').notNull(), 
  
  // 触发器配置 (如 Cron)
  triggers: jsonb('triggers'), 
  
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  creatorId: uuid('creator_id').references(() => users.id),
});
```

### 4.2 WorkflowExecutions 表
存储运行实例。

```typescript
export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),
  
  status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed', 'paused'
  
  input: jsonb('input'), // 初始输入
  output: jsonb('output'), // 最终输出
  
  // 当前执行上下文，存储所有已完成节点的输出，用于后续节点引用
  // key: nodeId, value: outputData
  context: jsonb('context'),
  
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  
  triggerType: text('trigger_type'), // 'manual', 'cron', 'api'
});
```

### 4.3 WorkflowNodeExecutions 表 (可选，或存入 context)
如果需要详细的审计日志，建议独立存储每个节点的执行记录。

```typescript
export const workflowNodeExecutions = pgTable('workflow_node_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  executionId: uuid('execution_id').references(() => workflowExecutions.id).notNull(),
  nodeId: text('node_id').notNull(), // 对应 graph 中的 node id
  nodeType: text('node_type').notNull(),
  
  status: text('status').notNull(),
  input: jsonb('input'),
  output: jsonb('output'),
  error: text('error'),
  
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // ms
});
```

## 5. 功能特性详解

### 5.1 异步与并行 (Parallelism)
引擎在解析 DAG 时，需计算节点的**入度 (In-degree)**。
- 当一个节点的依赖全部满足 (即父节点都已完成) 时，该节点进入 **Ready** 状态。
- 引擎可以同时将所有 Ready 的节点放入执行队列。
- 例如：节点 A 完成后，节点 B 和 C 都可以执行，引擎应同时触发 B 和 C 的任务。

### 5.2 复杂决策 (Branching)
支持基于数据的路由。
- **Switch Node**: 根据输入值的不同，激活不同的输出路径。
- **Condition Edge**: 边上带有条件表达式 (如 `{{nodeA.output.score}} > 0.8`)。只有条件为 true，后续节点才会被激活。

### 5.3 数据引用 (Data Mapping)
节点需要使用前序节点产生的数据。
- 采用 `{{nodeId.output.key}}` 的引用语法。
- 在执行节点前，引擎负责解析这些模板变量，替换为实际值。

## 6. 开发计划

### 第一阶段：核心引擎 (Core Engine)
1. 定义数据库 Schema (`workflows`, `workflow_executions`).
2. 实现基础的 DAG 解析器 (拓扑排序/依赖检查)。
3. 实现 `WorkflowService.run()`: 支持同步执行简单的线性流程。

### 第二阶段：异步调度 (Async Scheduler)
1. 引入任务队列 (pg-boss 或 BullMQ)。
2. 实现 `WorkflowWorker`: 从队列消费任务并执行节点。
3. 支持节点间的异步流转。

### 第三阶段：SOP 组件与 UI
1. 前端实现基于 ReactFlow 的可视化编排器。
2. 后端支持更多节点类型 (Logic, Loop)。
3. 支持 Cron 触发器。

## 7. 示例配置 (Graph JSON)

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "data": { "inputSchema": { "topic": "string" } }
    },
    {
      "id": "research_skill",
      "type": "skill",
      "data": { "skillId": "xyz-123", "input": { "query": "{{start.topic}}" } }
    },
    {
      "id": "write_skill",
      "type": "skill",
      "data": { "skillId": "abc-789", "input": { "context": "{{research_skill.output}}" } }
    },
    {
      "id": "end",
      "type": "end",
      "data": { "result": "{{write_skill.output}}" }
    }
  ],
  "edges": [
    { "source": "start", "target": "research_skill" },
    { "source": "research_skill", "target": "write_skill" },
    { "source": "write_skill", "target": "end" }
  ]
}
```
