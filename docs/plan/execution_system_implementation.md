# AgentOS Execution System Implementation Plan

本文档基于 [Background Task Agent 设计](file:///Users/hjr/Desktop/AgentOS/docs/design/execution_engine.md) 和 [Static Pipeline Engine 设计](file:///Users/hjr/Desktop/AgentOS/docs/design/static_pipeline_engine.md) 制定，详细列出了实施这两套系统所需的开发任务。

## 1. 数据库层 (Database Layer)

**目标**: 建立支持 Task Agent 和 Static Pipeline 的统一数据模型。

### 1.1 `tasks` 表重构
在 `packages/service/src/db/schema.ts` 中定义新的 `tasks` 表。

- **核心字段**:
    - `id` (uuid, PK)
    - `teamId` (uuid, FK)
    - `type` (enum: 'agent', 'pipeline') - **区分两种模式**
    - `instruction` (text) - 原始指令
    - `status` (enum: 'queued', 'processing', 'completed', 'failed')
    - `result` (text) - 最终结果摘要
    - `error` (text)

- **Smart Agent 模式字段** (当 `type='agent'`):
    - `agentProfile` (jsonb) - `{ name, role, goal, tone }`
    - `skillIds` (jsonb/array) - 允许使用的 Skill ID 列表

- **Pipeline 模式字段** (当 `type='pipeline'`):
    - `pipelineDefinition` (jsonb) - `{ steps: [...], inputs: [...] }`
    - `pipelineContext` (jsonb) - 运行时状态，存储每个 Step 的 output

### 1.2 `task_artifacts` 表新增
用于存储所有任务产生的交付物。
- `taskId` (FK)
- `type` (file, code, link)
- `name`, `url`, `size`, `mimeType`

## 2. 调度与队列 (Dispatcher & Queue)

**目标**: 实现统一的任务分发机制。

### 2.1 引入 `pg-boss`
- 在 `packages/service` 中安装并配置 `pg-boss`。
- 创建单一队列 `execution-queue`。

### 2.2 Task Service (`packages/service/src/domain/task/`)
- `createAgentTask(instruction, profile, skills)` -> Insert DB -> Push to Queue.
- `createPipelineTask(instruction, definition)` -> Insert DB -> Push to Queue.
- `getTaskStatus(id)`

## 3. 共享执行基建 (Shared Execution Infrastructure)

**目标**: 抽象出通用的沙箱交互、数据挂载和产物捕获层，供 Agent 和 Pipeline 复用。

### 3.1 Unified Sandbox Manager
封装底层的 Python/Node 沙箱调用。
- **Input Mounting**: 统一处理输入数据的挂载。
    - 如果输入参数是 `s3://...` 或内部文件 ID，自动下载并挂载到 `/workspace/input/`。
    - 自动注入环境变量，指向输入文件路径。
- **Skill Execution**: `runSkill(skillId, args, context)`。

### 3.2 Universal Artifact Sniffer (通用交付物嗅探器)
- **机制**: 监听沙箱的 `/workspace/output/` 目录。
- **触发**: 在每次 Skill 执行完毕后（无论是 Pipeline 的一步，还是 Agent 的一个 Action），立即扫描该目录。
- **动作**:
    1.  发现新文件 -> 上传至 OSS。
    2.  生成访问 URL。
    3.  写入 `task_artifacts` 表。
    4.  **关键**: 返回 Artifact 信息给调用层。
        - 对 Pipeline: 更新 `step.output`，让下一步骤可以引用该文件。
        - 对 Agent: 将 "Generated file: [link]" 注入到观察 (Observation) 中，让 LLM 知道文件已生成。

## 4. 执行引擎 (Execution Engines)

**目标**: 基于共享基建实现具体的业务逻辑。

### 4.1 Worker Entrypoint
- 监听 `execution-queue`。
- 初始化 `Unified Sandbox Manager`。
- 根据 `job.data.type` 分流到不同的 Runtime。

### 4.2 Pipeline Runtime (Static Mode)
- **逻辑**: 线性遍历 `steps`。
- **调用**: `sandbox.runSkill(...)`。
- **数据流**: 利用 Artifact Sniffer 返回的文件路径，替换后续步骤的输入参数。

### 4.3 Agent Runtime (Smart Mode)
- **逻辑**: ReAct 循环。
- **调用**: 当 LLM 选择执行 Tool 时，调用 `sandbox.runSkill(...)`。
- **感知**: Artifact Sniffer 捕获文件后，Agent 会收到系统消息 *"File 'report.csv' created at [URL]"*。

## 5. Super Agent 增强 (The Brain)

**目标**: 让 Super Agent 具备“分发者”和“编译器”的能力。

### 5.1 Tool 定义
1.  **`create_task`** (Smart Agent)
2.  **`compile_pipeline`** (Static Pipeline)

### 5.2 System Prompt 调优
- 指导 Super Agent 进行决策路由。

## 6. 开发里程碑 (Milestones)

### M1: 基础设施与共享层 (Week 1)
- [ ] DB: Schema 变更 (`tasks`, `task_artifacts`).
- [ ] Queue: `pg-boss` 集成。
- [ ] **Core**: 实现 `Unified Sandbox Manager` 和 `Artifact Sniffer` (支持文件输入挂载 + 输出捕获)。

### M2: Static Pipeline (Week 1-2)
- [ ] 实现 `PipelineRuntime`：对接共享层，实现串行调用。
- [ ] 实现 `compile_pipeline` 工具。
- [ ] 测试：输入文件 -> 转换 -> 输出文件。

### M3: Smart Agent (Week 2-3)
- [ ] 实现 `AgentRuntime`：对接共享层，支持 ReAct。
- [ ] 实现 `create_task` 工具。
- [ ] 测试：Agent 自主调用 Skill 生成文件，并能读取该文件进行下一步操作。

### M4: UI 与 联调 (Week 3)
- [ ] 前端：任务列表页、任务详情页（展示日志和 Artifacts）。
- [ ] 全链路联调。
