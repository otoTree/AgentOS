# Agent Skill 渐进式加载开发文档 (Development Documentation)

本文档旨在指导开发者在现有 `packages/agent` 代码库中实现基于 `SKILL.md` 的渐进式加载功能。

## 1. 目标回顾
在现有的 `SuperAgent` 架构中引入 "Skill" 概念，实现：
1.  **解析**: 解析增强版 Markdown (带 XML chunks)。
2.  **管理**: 维护 Skill 的状态 (摘要 vs 详细)。
3.  **加载**: 通过 Tool 动态加载文档片段。
4.  **集成**: 将 Skill 内容动态注入到 Agent 的 System Prompt 中。

## 2. 现有架构分析与集成点
- **Agent Core (`src/core/agent.ts`)**: 使用 `SimplePromptTemplate` 渲染 System Prompt。依赖 `context.variables`。
- **Tools (`src/tool/registry.ts`)**: 现有的工具注册机制。
- **Context**: `AgentContext` 包含 `variables` 和 `history`。

**集成策略**:
利用 `SuperAgent` 的 `context.variables` 机制。我们将创建一个 `SkillManager`，它负责生成 System Prompt 中所需的 Skill 描述字符串（包含摘要和可用 Chunks 列表）。当发生 `load_skill_chunk` 调用时，`SkillManager` 更新其内部状态，并重新生成描述字符串，更新 `context.variables`。

## 3. 开发任务清单

### 3.1 新增模块 (`packages/agent/src/skill/`)

需要创建以下文件和类：

#### 3.1.1 `src/skill/types.ts`
定义 Skill 相关的数据结构。
```typescript
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  [key: string]: any;
}

export interface SkillChunk {
  id: string;
  description: string;
  content: string;
}

export interface Skill {
  metadata: SkillMetadata;
  coreContent: string; // 移除 chunk 后的核心内容
  chunks: Map<string, SkillChunk>;
  activeChunks: Set<string>; // 当前已加载的 chunk IDs
}
```

#### 3.1.2 `src/skill/parser.ts`
实现 Markdown 解析逻辑。
- **功能**: 读取文件内容，提取 Frontmatter (YAML)，提取 `<chunk>` 标签，分离 Core Content。
- **依赖**: `yaml` (可能需要引入 front-matter 解析库或自写简单的正则解析)。

#### 3.1.3 `src/skill/manager.ts`
核心管理类。
```typescript
export class SkillManager {
  private skills: Map<string, Skill> = new Map();

  // 加载并解析目录下的所有 SKILL.md
  async loadFromDirectory(dir: string): Promise<void>;
  
  // 注册单个 Skill
  registerSkill(content: string): void;

  // 获取用于 System Prompt 的描述文本
  // 格式: 
  // ## {SkillName}
  // {CoreContent}
  // [Available Chunks]
  // - {id}: {desc}
  getSkillsPrompt(): string;

  // 加载指定 Chunk (用于 Tool 调用)
  // 返回 Chunk 内容，并标记为 active (影响下一次 getSkillsPrompt)
  activateChunk(skillName: string, chunkId: string): string;
}
```

#### 3.1.4 `src/skill/tools.ts`
定义加载工具。
```typescript
export class LoadSkillChunkTool implements Tool {
  name = "load_skill_chunk";
  description = "...";
  // ...
  constructor(private manager: SkillManager) {}
  
  async execute(args: { skill_name: string; chunk_id: string }) {
    return this.manager.activateChunk(args.skill_name, args.chunk_id);
  }
}
```

### 3.2 修改现有代码

#### 3.2.1 `src/core/types.ts`
不需要破坏性修改。可能需要扩展 `AgentConfig` 以便更方便地传入 `SkillManager`，但这并非强制，可以通过外部组装实现。

#### 3.2.2 `src/core/agent.ts` (可选优化)
目前的 `SuperAgent` 在每一轮循环中都会重新构建 Prompt (`buildMessages`)。
```typescript
// 伪代码逻辑
const systemTemplate = new SimplePromptTemplate(this.config.prompts.system);
systemPrompt = systemTemplate.format(this.context.variables);
```
**关键点**: 确保 `context.variables` 中的值是最新的。
我们需要一种机制，让 `SkillManager` 的状态变化能同步到 `agent.context.variables`。

**建议方案**:
在 `SuperAgent` 初始化或运行前，允许传入一个 "Variable Provider" 或者简单的引用更新。
最简单的方式是：在 `load_skill_chunk` 工具执行时，除了更新 `SkillManager` 内部状态，还显式更新传入的 `context.variables` 对象（如果是引用传递）。
或者，`SuperAgent` 提供一个 hook `onStepStart`，我们在那里刷新 variables。

### 3.3 依赖库
- 检查是否需要 `js-yaml` 或 `front-matter` 来解析 YAML header。项目中似乎已有 `@agentos/global`，检查其中是否有相关工具。如果有 `zod`，可能已经有基础依赖。

## 4. 详细实施步骤

### 第一步：基础结构与类型 (Types)
在 `packages/agent/src/skill/types.ts` 中定义接口。

### 第二步：解析器实现 (Parser)
在 `packages/agent/src/skill/parser.ts` 中实现解析逻辑。
- 编写单元测试 `test/skill/parser.spec.ts`，验证能够正确分离 Core 和 Chunks。

### 第三步：管理器实现 (Manager)
在 `packages/agent/src/skill/manager.ts` 中实现。
- 实现 `getSkillsPrompt()`：遍历所有 Skill，拼接 `metadata` + `coreContent` + `available chunks list`。
- 处理 `activeChunks` 逻辑：如果 chunk 激活了，是否还要显示在 list 中？建议：激活后从 list 移除，且在下一次 `getSkillsPrompt` 时直接拼接到正文中（或者仅依赖 History 中的 Tool Result，这里需要决策）。
  - **决策**: 为了防止 Token 无限增长，建议 **只依赖 History** 存储已加载的 Chunk 内容。`getSkillsPrompt` 仅负责展示 **静态核心** 和 **未加载列表**。
  - **修正**: 如果 Chunk 非常重要且必须长期存在，可以拼接到 System Prompt。但在 "渐进式加载" 语境下，通常是为了解决当前问题。
  - **最终建议**: `load_skill_chunk` 返回内容，内容进入 History。`getSkillsPrompt` 保持不变（或者从 Available 列表中移除该 ID 以避免重复加载，但这需要状态同步）。

### 第四步：工具实现 (Tool)
在 `packages/agent/src/skill/tools.ts` 中实现 `LoadSkillChunkTool`。

### 第五步：集成测试
编写一个集成测试 `test/skill/integration.spec.ts`：
1. 创建 `SkillManager` 并加载示例 Skill。
2. 创建 `SuperAgent`，将 `{{skill_docs}}` 放入 System Prompt。
3. 将 `SkillManager.getSkillsPrompt()` 的结果放入 Agent 的 `variables`。
4. 运行 Agent，模拟 Agent 调用 `load_skill_chunk`。
5. 验证 Tool 返回了 Chunk 内容。
6. (进阶) 验证 Tool 调用后，Agent 能利用新信息回答问题。

## 5. 使用示例 (Developer Experience)

```typescript
// 1. 初始化 Manager
const skillManager = new SkillManager();
await skillManager.loadFromDirectory('./skills');

// 2. 准备 Prompt 变量更新函数
const updateSkillDocs = () => {
  return { skill_docs: skillManager.getSkillsPrompt() };
};

// 3. 配置 Agent
const agent = new SuperAgent({
  // ...
  prompts: {
    system: "You are an agent.\n\nSkills:\n{{skill_docs}}",
  },
  tools: [
    ...otherTools,
    new LoadSkillChunkTool(skillManager) // 工具内部会更新 manager 状态
  ]
});

// 4. 初始化变量
agent.setContextVariables(updateSkillDocs());

// 5. 运行
await agent.run("Use the data analyzer skill...");
```

## 6. 注意事项
- **Token Limit**: 虽然渐进式加载减少了初始 Token，但如果 Agent 加载了太多 Chunks，History 依然会增长。
- **Parser 鲁棒性**: 确保正则能处理包含嵌套标签或特殊字符的情况（虽然 XML 在 Markdown 中通常比较简单）。
- **文件路径**: 确保 `SkillManager` 能正确找到文件路径。
