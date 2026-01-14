# Agent Skill 渐进式加载实现设计 (Skill Progressive Loading Design)

## 1. 概述
本设计文档基于 [SKILL_MD_SPEC.md](./SKILL_MD_SPEC.md)，详细说明 Agent 如何实现对 `SKILL.md` 的渐进式加载（Progressive Loading）。核心目标是降低 Context 占用，同时赋予 Agent 按需获取详细信息的能力。

## 2. 核心组件架构

主要涉及以下组件：
1.  **SkillParser**: 负责解析 Markdown + XML 格式，分离 Core Content 和 Chunks。
2.  **SkillManager (Registry)**: 管理所有 Skill 的加载状态、缓存。
3.  **AgentContextBuilder**: 负责构建 Agent 的 Prompt，根据当前加载状态动态拼接 Skill 内容。
4.  **SystemTool**: 提供 `load_skill_chunk` 工具给 Agent 调用。

### 2.1 数据结构定义

```typescript
// Skill 的元数据 (Frontmatter)
interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  [key: string]: any;
}

// 扩展块 (Chunk) 定义
interface SkillChunk {
  id: string;
  description: string;
  content: string; // 块内的实际 Markdown 内容
}

// 解析后的完整 Skill 对象
interface Skill {
  metadata: SkillMetadata;
  
  // 核心内容：包含 Frontmatter 后的所有非 Chunk 内容
  // 这里的 content 不包含 <chunk> 标签及其内容
  coreContent: string; 
  
  // 所有可用的 Chunk，Key 为 Chunk ID
  chunks: Map<string, SkillChunk>;
  
  // 当前已加载到 Context 中的 Chunk ID 列表 (运行时状态)
  activeChunks: Set<string>; 
}
```

## 3. 解析逻辑 (SkillParser)

解析器需要处理 Markdown 文件，提取 Frontmatter 和 XML Chunks。

### 流程
1.  **读取文件**: 读取 `.md` 文件内容。
2.  **提取 Frontmatter**: 使用 standard library 或 regex 提取 YAML 头。
3.  **提取 Chunks**:
    - 使用正则 `/<chunk\s+id="([^"]+)"\s+description="([^"]+)">([\s\S]*?)<\/chunk>/g` 匹配所有块。
    - 保存匹配到的 `id`, `description`, `content` 到 `chunks` Map。
    - **关键**: 从原始内容中**移除**匹配到的 Chunk 文本，剩余部分作为 `coreContent`。
4.  **生成摘要视图**: `coreContent` 需保持清洁，不包含 XML 标签。

## 4. Agent 交互流程

### 4.1 初始化 (Summary Mode)
当 Agent 初始化或重置时，加载所有 Skill 的摘要模式。

**Context 构造逻辑**:
对于每个 Skill，Prompt 中包含：
1.  `metadata.name` 和 `metadata.description`
2.  `coreContent`
3.  **Available Chunks List**:
    ```markdown
    [Available Chunks for {skill_name}]
    (You can load these using load_skill_chunk tool)
    - id: examples | description: Few-shot examples for complex scenarios
    - id: troubleshooting | description: Common errors and fixes
    ```

### 4.2 运行时按需加载 (On-Demand Loading)

#### Tool 定义
Agent 将被注入一个系统级工具：

```typescript
{
  name: "load_skill_chunk",
  description: "Load specific documentation chunk for a skill when you need more details (e.g., examples, edge cases).",
  parameters: {
    type: "object",
    properties: {
      skill_name: { type: "string", description: "The name of the skill" },
      chunk_id: { type: "string", description: "The ID of the chunk to load" }
    },
    required: ["skill_name", "chunk_id"]
  }
}
```

#### 执行流程
1.  **Agent 思考**: 遇到用户问题，发现 Core Content 信息不足（例如不懂某个参数的具体格式）。
2.  **查看列表**: Agent 看到 "Available Chunks" 中有 `examples`。
3.  **调用工具**: `load_skill_chunk(skill_name="data_analyzer", chunk_id="examples")`。
4.  **后端处理**:
    - `SkillManager` 找到对应 Skill。
    - 获取 `chunk_id` 对应的 content。
    - 将 `chunk_id` 加入 `activeChunks` 集合（可选，用于后续轮次自动包含）。
5.  **工具返回**:
    - 返回 Chunk 的具体内容。
6.  **上下文更新**:
    - **短期**: 当前轮次的 Tool Output 包含该 Chunk 内容。
    - **长期 (可选)**: 下一轮 Prompt 构建时，系统检测到 `activeChunks`，直接将该 Chunk 内容拼接到 Skill 描述下方，不再显示在 "Available Chunks" 列表中（或标记为已加载）。

## 5. 模块接口设计

### SkillLoader
```typescript
class SkillLoader {
  static parse(fileContent: string): Skill {
    // Implementation of parsing logic
  }
  
  static formatForPrompt(skill: Skill): string {
    // 1. Frontmatter info
    // 2. Core Content
    // 3. Dynamic list of UNLOADED chunks
    // 4. Content of LOADED chunks (if stateful)
  }
}
```

### SkillManager
```typescript
class SkillManager {
  private skills: Map<string, Skill> = new Map();

  loadAll(dir: string) { ... }
  
  getChunk(skillName: string, chunkId: string): string | null {
    // Return chunk content
  }
}
```

## 6. 异常处理
1.  **Chunk 不存在**: Tool 返回清晰错误 "Chunk '{id}' not found in skill '{name}'."。
2.  **Skill 不存在**: Tool 返回 "Skill '{name}' not found."。
3.  **Token 限制**: 如果加载 Chunk 后超出 Context 限制，需有保护机制（报错或截断）。

## 7. 下一步计划
1.  实现 `SkillParser`。
2.  实现 `SkillManager`。
3.  在 Agent 的 Tool 列表中注册 `load_skill_chunk`。
4.  更新 Prompt Template 以支持动态 Skill 展示。
