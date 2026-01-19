# Desktop 架构技术规格说明书 (Desktop Spec)

## 1. 概述 (Overview)

AgentOS Desktop 是用户的本地执行环境与交互终端。基于 **Electrobun** 构建，结合了 Web 技术的灵活性与 Native 能力的高效性。Desktop 端坚持 **"Local Execution, Remote Intelligence"** 原则，负责 UI 渲染、本地工具调用、文件系统监听与向量库管理，但不运行本地 LLM。

## 2. 技术栈 (Tech Stack)

*   **Runtime**: [Electrobun](https://github.com/blacksmithgu/electrobun) (Bun + Chromium)
    *   **Main Process**: Bun (高性能 TypeScript 运行时)
    *   **Renderer Process**: Chromium (Web 视图)
*   **UI Framework**: React + TailwindCSS + Shadcn/UI
*   **Local Database**: LanceDB (嵌入式向量数据库)
*   **RPC**: Electrobun 自带 IPC 或 tRPC

## 3. 核心模块 (Core Modules)

### 3.1 主进程 (Bun Main Process)
位于 `projects/desktop/src/bun/index.ts`，负责系统级操作。

*   **Window Management**: 创建与管理 Browser Window。
*   **Local Vector DB**: 集成 LanceDB Node.js SDK，管理本地向量索引。
*   **File Watcher**: 监听指定目录 (Workspace) 的文件变动，触发索引更新流程。
*   **System Tools**: 执行本地 Shell 命令、文件读写等操作 (供 Agent 调用)。

### 3.2 渲染进程 (Renderer Process)
位于 `projects/desktop/src/mainview/`，负责用户交互。

*   **Super Agent UI**: 聊天界面，支持流式渲染、Artifact 展示。
*   **GenUI Runtime**: 渲染动态生成的 UI 组件。
*   **Client State**: 管理会话状态、用户设置。

### 3.3 Agent Runtime (Local)
移植并适配 `packages/agent`，运行在 **Main Process** 中以获得最大权限和性能。

*   **Remote Model Client**:
    *   通过 HTTPS 连接 Server 的 `/api/v1/ai` 接口。
    *   处理鉴权、流式响应解析、错误重试。
*   **Tool Manager**:
    *   注册本地工具 (`read_file`, `exec_command`, `open_app`)。
    *   处理 Tool Call 请求，执行本地逻辑并返回结果。
*   **Context Manager**:
    *   维护对话历史。
    *   集成 Local RAG：将 User Query -> Server Embedding -> Local LanceDB Search -> Context 注入。

## 4. 数据流 (Data Flow)

### 4.1 RAG 索引流程 (Indexing Pipeline)
1.  **Watch**: File Watcher 检测到文件 `doc.md` 变更。
2.  **Extract**: Main Process 读取并提取文本。
3.  **Embed (Remote)**: 发送文本至 Server `/api/v1/ai/embeddings`。
4.  **Save (Local)**: 接收向量，存入本地 LanceDB (`~/.agentos/lancedb`).

### 4.2 Agent 执行流程 (Execution Loop)
1.  **User Input**: 用户在 UI 输入指令。
2.  **Retrieve**: (可选) 本地 RAG 检索相关文档。
3.  **Chat (Remote)**: 组装 Prompt (含 Context) 发送至 Server `/api/v1/ai/chat/completions`。
4.  **Tool Call**:
    *   Server 返回 `tool_calls: [{ name: "read_file", ... }]`。
    *   Desktop Main Process 拦截，执行本地 `fs.readFile`。
    *   结果回传给 Server (继续对话)。
5.  **Render**: 最终回复显示在 UI。

## 5. 目录结构 (Directory Structure)

```
projects/desktop/
├── electrobun.config.ts    # Electrobun 配置
├── src/
│   ├── bun/                # [Main Process]
│   │   ├── index.ts        # 入口
│   │   ├── runtime/        # Agent Runtime 适配
│   │   ├── db/             # LanceDB 管理
│   │   └── tools/          # 本地工具集
│   └── mainview/           # [Renderer Process]
│       ├── index.html
│       ├── index.ts
│       ├── App.tsx
│       └── components/
└── package.json
```

## 6. 接口定义 (IPC Schema)

Main 与 Renderer 之间的通信协议。

*   `agent:sendMessage(message: string)`: UI 发送消息。
*   `agent:onChunk(chunk: string)`: UI 接收流式回复。
*   `system:selectFile()`: 打开文件选择器。
*   `db:query(text: string)`: 测试性查询向量库。
