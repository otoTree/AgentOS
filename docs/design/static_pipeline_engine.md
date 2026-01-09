# Static Pipeline Engine (Lightweight Execution) 设计文档

## 1. 背景与问题

在 AgentOS 的 `Background Task Agent` 架构中，默认的 "Smart Agent" 模式依赖 LLM 的 ReAct (Reasoning + Acting) 循环。虽然灵活性极高，但在处理简单、确定性的任务时存在以下问题：

1.  **高延迟 (Latency)**: 每执行一个动作都需要 LLM 进行一次推理，网络 IO 和 Token 生成耗时显著。
2.  **高成本 (Cost)**: 简单的 API 调用组合（如“抓取网页 -> 提取正文 -> 存文件”）不应消耗昂贵的 LLM Token。
3.  **不稳定性 (Indeterminacy)**: LLM 可能会在简单的逻辑中产生幻觉或偏离指令。

为了解决上述问题，我们需要引入 **Static Pipeline (静态流水线)** 机制。

## 2. 核心概念

### 2.1 编译与执行分离
我们引入“编译”概念，将自然语言指令转化为确定的执行脚本。

*   **Compiler (编译时)**: 由 **Super Agent** (或专门的 Planner 模型) 承担。它一次性分析用户需求，生成一个包含多个步骤的 JSON 执行计划（Pipeline Definition）。
*   **Runtime (运行时)**: 一个轻量级的 **Pipeline Executor**。它不包含 LLM，仅负责解析 JSON，按顺序调用 Skill，并处理简单的数据流转。

### 2.2 适用场景
*   **数据ETL**: "把 API A 的数据拿来，转换格式，存入数据库。"
*   **简单自动化**: "每天早上 8 点抓取天气，发邮件给我。"
*   **批量处理**: "对这 100 个 URL 执行相同的抓取逻辑。"

## 3. 系统架构

```mermaid
graph TD
    User[User] -->|1. Request| Super[Super Agent]
    
    subgraph "Compiler (LLM)"
        Super -->|2. Analyze| Decision{Complex or Simple?}
        Decision -->|Complex| SmartAgent[Create Smart Agent (ReAct)]
        Decision -->|Simple| Compiler[Compile to Pipeline JSON]
    end
    
    Compiler -->|3. Serial Plan| PipelineDef[Pipeline Definition (JSON)]
    
    subgraph "Runtime (No LLM)"
        PipelineDef -->|4. Input| Executor[Pipeline Executor]
        Executor -->|5. Step 1| SkillA[Skill A]
        SkillA -->|Output| Context[Execution Context]
        Context -->|Input| SkillB[Skill B]
        SkillB -->|6. Step 2| SkillB
    end
    
    SkillB -->|7. Result| DB[(Database/Artifacts)]
```

## 4. Pipeline 定义规范 (Schema)

Pipeline 被定义为一个 JSON 对象，核心是一个有序的 `steps` 数组。

### 4.1 数据结构

```typescript
interface PipelineDefinition {
  version: "1.0";
  description?: string;
  
  // 定义输入参数，用于校验
  inputs: string[]; 
  
  // 执行步骤
  steps: PipelineStep[];
}

interface PipelineStep {
  id: string; // 步骤标识符，用于引用输出
  skill: string; // Skill ID 或名称
  
  // 参数配置，支持变量引用 {{stepId.output.key}}
  params: Record<string, any>;
  
  // 可选：简单的条件控制
  if?: string; // 表达式，如 "{{inputs.retry}} == true"
}
```

### 4.2 示例：网页抓取与存储

用户指令："抓取 example.com 的内容，并保存为 output.txt"。

Super Agent 编译生成的 JSON：

```json
{
  "version": "1.0",
  "description": "Fetch and Save",
  "inputs": ["url", "filename"],
  "steps": [
    {
      "id": "fetch",
      "skill": "http_request",
      "params": {
        "method": "GET",
        "url": "{{inputs.url}}" // 引用输入
      }
    },
    {
      "id": "save",
      "skill": "file_write",
      "params": {
        "path": "{{inputs.filename}}",
        "content": "{{fetch.output.body}}" // 引用上一步的输出
      }
    }
  ]
}
```

## 5. 核心组件设计

### 5.1 Super Agent 的 `compile_pipeline` 工具
为了支持这种模式，Super Agent 需要一个新的工具。

*   **Tool Name**: `compile_and_run_pipeline`
*   **Description**: "当任务由明确的、固定的步骤组成时使用此工具。不要用于需要推理或不确定性决策的任务。"
*   **Arguments**:
    *   `plan` (json): 符合 Pipeline Schema 的 JSON 对象。
*   **Behavior**: 系统接收到 JSON 后，直接将其发送给 Pipeline Executor 运行。

### 5.2 Pipeline Executor (Runtime)
一个纯代码实现的执行器（Node.js 或 Python）。

**执行逻辑**:
1.  **Init**: 创建上下文对象 `Context`，加载 `inputs`。
2.  **Loop**: 遍历 `steps`。
3.  **Resolve**: 解析当前 step `params` 中的 `{{variable}}` 模板。
4.  **Execute**: 调用对应的 Skill 函数。
5.  **Update**: 将 Skill 的返回值写入 `Context[step.id].output`。
6.  **Error Handling**: 如果某一步失败，根据策略（Fail-fast 或 Continue）处理。

### 5.3 数据流转 (Variable Substitution & Dependency)
为了支持复杂的依赖关系，我们需要强大的变量替换机制。

#### 5.3.1 引用语法 (Mustache-like)
支持使用 `{{ object.path }}` 语法引用 Context 中的数据。
- `{{ inputs.my_var }}`: 引用初始输入。
- `{{ step_id.output }}`: 引用某一步骤的完整输出。
- `{{ step_id.output.result_key }}`: 引用输出 JSON 中的特定字段。

#### 5.3.2 复杂对象访问 (Deep Access)
如果 Skill 返回的是嵌套 JSON 对象，例如：
```json
// Step 'search_users' output
{
  "users": [
    { "id": 101, "name": "Alice" },
    { "id": 102, "name": "Bob" }
  ],
  "count": 2
}
```
后续步骤可以这样引用：
- `{{ search_users.output.users[0].id }}` -> 解析为 `101`
- `{{ search_users.output.count }}` -> 解析为 `2`

#### 5.3.3 Artifact 传递 (File Dependency)
对于文件传递，我们约定 Skill 的输出中包含文件的**绝对路径**或**URI**。
- **Step 1 (Generate)**: `generate_chart` 生成图片，返回 `{"file_path": "/workspace/output/chart.png"}`。
- **Step 2 (Consume)**: `send_email` 需要附件。
    - 参数配置: `attachments: ["{{ generate_chart.output.file_path }}"]`
    - 执行器在解析时，会将模板替换为实际的文件路径。

## 6. 与 Task Agent 体系的融合

Pipeline Execution 本质上是一种特殊的 Task。

### 6.1 统一的 Task 表
我们可以复用 `Tasks` 表，通过 `type` 字段区分。

```typescript
export const tasks = pgTable('tasks', {
  // ... 其他字段
  
  // 任务类型
  type: text('type').default('agent').notNull(), // 'agent' (Smart) | 'pipeline' (Static)
  
  // 如果是 pipeline 类型，这里存储 JSON 定义
  pipelineDefinition: jsonb('pipeline_definition'),
  
  // 如果是 agent 类型，这里存储 profile
  agentProfile: jsonb('agent_profile'),
});
```

### 6.2 决策路由
Super Agent 拥有最高的决策权：
1.  用户请求 -> Super Agent 思考。
2.  Super Agent 判断：
    *   需要复杂推理？ -> 调用 `create_task` (创建 Smart Agent)。
    *   是简单的线性逻辑？ -> 调用 `compile_and_run_pipeline` (创建 Static Pipeline)。

## 7. 开发计划

### 第一阶段：Executor 实现
1.  实现 `PipelineExecutor` 类：支持简单的步骤遍历和变量替换。
2.  支持基础 Skill 的直接调用。
3.  **Dependency Test**: 编写单元测试，验证 Step B 正确读取 Step A 的 JSON 输出和文件路径。

### 第二阶段：Super Agent 集成
1.  定义 `compile_and_run_pipeline` 工具。
2.  优化 Super Agent 的 System Prompt，教它何时使用 Compiler 模式。
    *   *Example*: "If user asks to 'fetch X and save to Y', create a 2-step pipeline instead of an agent."

### 第三阶段：混合编排 (Advanced)
1.  允许 Pipeline 中的某一步骤是 "Ask LLM"（即在静态流中嵌入轻量的 LLM 调用），实现低成本的逻辑判断。
