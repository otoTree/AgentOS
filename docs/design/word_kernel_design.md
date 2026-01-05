# AgentOS 云端 Word 文档微内核 (Word-Kernel) 设计文档

## 1. 概述

本文档旨在设计一个高性能、可扩展且面向 AI Agent 优化的云端 Word 文档微内核。该内核将被封装在 `@agentos/word-kernel` 包中，作为 AgentOS 平台处理文档的核心基础设施。

### 1.1 设计目标
- **微内核架构**: 核心仅负责状态管理与分发，功能通过插件扩展。
- **Agent 优先**: 提供结构化数据访问和原子化操作接口，方便 LLM 理解和修改文档。
- **Docx 原生支持**: 能够解析、编辑并导出标准 `.docx` 格式。
- **协同就绪**: 内置对 CRDT (Yjs) 的支持，适配云端多人协作场景。

---

## 2. 架构设计

采用微内核 (Micro-kernel) 架构，将核心逻辑与具体实现分离。

### 2.1 核心组件
- **Kernel (内核)**: 管理文档状态机、生命周期、配置及插件注册。
- **Store (存储)**: 基于响应式状态或 CRDT 的文档数据模型。
- **Command Bus (命令总线)**: 所有的修改操作必须通过命令执行，支持 Undo/Redo 和操作审计。

### 2.2 插件系统
- **Parser Plugin**: 负责 `.docx` 到内部 JSON 模型 (Schema) 的双向转换。
- **Render Plugin**: 提供不同端的渲染实现（如 React 渲染、Canvas 渲染、Markdown 预览）。
- **Agent Capability Plugin**: 封装面向 Agent 的高级能力。

---

## 3. 目录结构与包封装

该内核将作为 Monorepo 中的一个独立包进行封装：

```text
packages/word-kernel/
├── src/
│   ├── core/           # 微内核核心 (State, Command, Plugin Manager)
│   ├── model/          # Schema 定义与数据模型
│   ├── plugins/        # 官方标准插件
│   │   ├── parser/     # Docx 解析插件
│   │   ├── renderer/   # 基础渲染插件
│   │   └── agent/      # Agent 能力封装
│   ├── shared/         # 工具函数与常量
│   └── index.ts        # 公共 API 出口
├── tests/              # 单元测试与集成测试
├── package.json
└── tsconfig.json
```

---

## 4. 数据模型 (Document Schema)

为了平衡 `.docx` 的复杂性和 Agent 的可理解性，采用类似 Slate.js 或 ProseMirror 的树状 JSON 结构。

```typescript
type DocumentState = {
  uid: string;
  metadata: Record<string, any>;
  content: BlockNode[];
};

type BlockNode = {
  type: 'paragraph' | 'heading' | 'table' | 'image' | 'list';
  id: string;
  props: Record<string, any>;
  children: (InlineNode | BlockNode)[];
};

type InlineNode = {
  type: 'text';
  text: string;
  marks: ('bold' | 'italic' | 'link')[];
};
```

### 4.1 Docx 解析策略
- **导入**: 采用 `mammoth.js` 或自定义 XML 解析器，将 OpenXML 转换为内部 JSON 模型。
- **导出**: 使用 `docx` 库根据 JSON 模型重新构建 OpenXML 文件。

---

## 5. 渲染系统

内核不绑定特定渲染引擎，通过 `RendererAdapter` 进行解耦。

- **Web 渲染**: 基于 React + ContentEditable 或自定义渲染器实现高性能编辑。
- **Agent 视图**: 提供一个 `SimplifiedView`，将文档转换为紧凑的 Markdown 或 Text，作为 LLM 的 Context。
- **虚拟滚动**: 针对超长文档提供按需加载能力。

---

## 6. 面向 Agent 的底层能力

这是本项目区别于普通编辑器内核的关键。

### 6.1 原子操作接口 (Agent Tools)
Agent 不直接修改 DOM，而是调用内核提供的原子工具，这些工具会被注册为 LLM 的 Functions/Tools：
- `insert(path: Path, content: Node[] | string)`: 在指定路径（如 `[0, 1]`）插入内容。
- `delete(range: Range)`: 删除指定范围的内容。
- `updateProps(path: Path, props: Record<string, any>)`: 更新节点的属性（如表格样式、标题级别）。
- `applyFormatting(range: Range, marks: string[])`: 应用文本格式（粗体、链接等）。

### 6.2 语义化查询与上下文提取
- `getOutline()`: 返回文档的标题树结构，帮助 Agent 快速定位。
- `getFragment(selector: string)`: 根据关键词、标签或语义特征查找文档片段。
- `getSelectionContext()`: 获取当前光标周围的文本上下文，为 Agent 提供补全建议。
- `toMarkdown()`: 将文档或选区转换为 Markdown，作为 LLM 的 Prompt 输入。

### 6.3 结构化数据转换
- `tableToJson(tableId: string)`: 将文档中的表格转换为标准的 JSON 数组，方便 Agent 进行数据分析。
- `jsonToTable(data: any[])`: 将 Agent 生成的数据自动转换回文档表格。

---

## 7. 协作与持久化

- **协同引擎**: 集成 `Yjs` 实现文档状态的实时同步。
- **云端存储**: 对接 OSS (对象存储) 存储原始文件，PostgreSQL 存储文档元数据和版本快照。

---

## 8. 实施路线图

1. **Phase 1**: 定义基础 Schema 和微内核框架，实现基本的 Docx 解析与导出。
2. **Phase 2**: 开发 Web 端渲染插件，支持基本编辑功能。
3. **Phase 3**: 封装 Agent 能力集，实现第一个 "Agent 写文档" 的 Demo。
4. **Phase 4**: 引入 Yjs 支持多人协作和历史版本回溯。
