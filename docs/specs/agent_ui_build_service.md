# AgentUI 构建与部署服务技术规格说明书 (SPEC)

## 1. 概述 (Overview)

本规格说明书定义了 **AgentUI 构建与部署服务** 的技术实现方案。该服务旨在为 AgentOS 用户提供一键式的 Agent 独立应用生成能力。用户在 `projects/app` (AgentOS Web 应用) 中完成 Agent 的编排与配置后，系统将自动生成对应的 NextJS/React 前端代码，并将 Skill 调用逻辑以 API 请求的形式直接注入代码中。最终，通过集成的构建项目（Agent Builder Project）使用 Bun 将服务编译为跨平台的独立二进制文件，实现“打包与部署一体化”。

## 2. 目标 (Goals)

1.  **一体化构建流程**：从用户配置到最终产物，全流程自动化，无需人工干预代码。
2.  **动态代码生成**：根据 Agent 配置动态生成 React/NextJS 页面及组件，而非仅使用通用模板。
3.  **Skill API 直连**：Skill 的调用逻辑直接生成为前端可执行的 API 请求代码（fetch/axios），嵌入到生成的应用中。
4.  **独立可执行产物**：利用 `bun build --compile` 将 Web 服务（UI + API Proxy）打包为单文件，实现零依赖分发。
5.  **专用构建服务**：设立独立的构建项目（Project）来支撑编译、打包和资源整合任务。

## 3. 系统架构 (System Architecture)

系统架构围绕“配置驱动生成”的核心思想，连接了用户配置端、代码生成器和构建运行时。

### 3.1 架构图示

```mermaid
graph TD
    User[用户 (projects/app)] -->|1. 配置 Agent & 触发构建| AppAPI[App Server]
    AppAPI -->|2. 提交构建任务| Builder[Agent Builder Project]
    
    subgraph Agent Builder Project
        Generator[代码生成引擎]
        Injector[Skill API 注入器]
        Bundler[Bun 编译器]
    end
    
    Builder -->|3. 拉取配置| DB[(Database)]
    Builder -->|4. 生成 React/NextJS 源码| SourceCode[临时源码目录]
    Builder -->|5. 注入 API 调用逻辑| SourceCode
    Builder -->|6. 编译 & 打包| Artifact[二进制产物 (Executable)]
    
    Artifact -->|7. 分发/下载| UserLocal[用户本地环境]
```

### 3.2 关键组件

1.  **Trigger (projects/app)**: 用户交互的入口，负责收集 Agent 的元数据、Prompt、Skill 列表等配置信息。
2.  **Agent Builder Project (Express Service)**: 
    -   基于 **Express** 框架构建的独立微服务，作为构建系统的控制中心。
    -   **管理**: 维护构建任务队列、状态追踪、产物管理。
    -   **转发**: 接收来自主应用 (`projects/app`) 的构建请求，调度底层的构建 Worker 或执行 Shell 命令；同时可作为产物下载的代理端点。
    -   **Process Manager (PM)**: 负责在服务端托管运行 Agent 实例，支持批量启动、停止和状态监控。
    -   **技术栈**: Express, Node.js/Bun, ShellJS (用于执行构建命令), SQLite/PostgreSQL (用于记录实例状态)。

## 4. 详细设计 (Detailed Design)

### 4.1 Build Service 接口定义 (Express Endpoints)

构建服务通过 Express 暴露以下 RESTful 端点供主应用调用：

#### 4.1.1 发起构建任务
- **Endpoint**: `POST /api/v1/build/agent-ui`
- **Handler**: `BuilderController.createJob`
- **Request Body**:
    ```json
    {
      "agentId": "uuid-string",
      "version": "1.0.0",
      "platform": "darwin-arm64" | "linux-x64" | "windows-x64",
      "config": { ... }
    }
    ```
- **Logic**: 
    1. 校验版本号格式 (SemVer)。
    2. 生成 Job ID。
    3. 将任务推入队列。

#### 4.1.2 查询构建状态
- **Endpoint**: `GET /api/v1/build/jobs/:jobId`
- **Handler**: `BuilderController.getJobStatus`
- **Logic**: 查询任务状态，返回进度、产物下载链接及元数据。

#### 4.1.3 检查版本更新 (App 使用)
- **Endpoint**: `GET /api/v1/build/updates/check`
- **Query**: `?agentId=...&currentVersion=1.0.0&platform=...`
- **Response**:
    ```json
    {
      "hasUpdate": true,
      "latestVersion": "1.0.1",
      "downloadUrl": "https://oss.../agent-app-1.0.1"
    }
    ```

#### 4.1.4 托管实例管理 (Hosting API)
- **Endpoint**: `POST /api/v1/instances/start`
- **Body**: `{ "jobId": "...", "port": 8081 }`
- **Logic**: 启动指定构建产物的进程，并记录到数据库。

- **Endpoint**: `POST /api/v1/instances/stop`
- **Body**: `{ "instanceId": "..." }`
- **Logic**: 停止指定进程，更新数据库状态。

### 4.2 构建流程 (Build Pipeline)


### 4.2.1 源码生成与传输阶段 (Source Generation & Transfer) - [由 projects/app 实现]

**注意：本阶段逻辑集成在主应用 (`projects/app`) 中实现。**

当用户在前端触发构建时，主应用负责根据当前配置在内存中或临时目录生成完整的前端项目源码，并上传至 OSS 供构建服务使用。

1.  **脚手架初始化**: 准备标准 NextJS/React 最小化模板。
2.  **UI 组件生成**: 根据 Agent 的设定的主题、标题、欢迎语生成 UI 组件代码。
3.  **逻辑注入**: 读取 Agent 关联的 Skill 列表，生成对应的 API 调用代码。
4.  **Meta 信息生成**: 生成 `build-meta.json`，包含：
    -   `agentId`: Agent 唯一标识
    -   `version`: 当前构建版本号 (如 1.0.0)
    -   `updateUrl`: 检查更新的 API 地址 (指向 Build Service)
    -   `buildTime`: 构建时间戳
5.  **上传 OSS**: 将生成的源码目录打包（zip/tar）并上传至对象存储（OSS），获取下载链接。
6.  **提交任务**: 调用 Build Service 的 `POST /api/v1/build/agent-ui` 接口，携带 OSS 源码包地址和 Meta 信息。

### 4.2.2 编译与打包阶段 (Compilation) - [由 Agent Builder Project 实现]

构建服务收到请求后，执行以下步骤：

1.  **准备环境**: 在临时目录下载并解压 OSS 中的源码包。
2.  **读取配置**: 解析 `build-meta.json`，获取构建参数。
3.  **安装依赖**: 执行 `bun install`。
4.  **Web 资源构建**: 运行 `bun run build` (NextJS/Vite)，生成静态资源。
5.  **二进制打包**:
    -   使用 Bun 将 `server.ts` 及其依赖（包括静态资源）编译为单一可执行文件。
    -   命令示例: `bun build ./server.ts --compile --outfile agent-app`。
6.  **产物归档**:
    -   将编译好的二进制文件复制到独立的产物目录。
    -   **关键**: 将 `build-meta.json` 一并复制到产物目录，确保产物可追溯。
    -   将最终产物（二进制 + Meta）打包并回传至 OSS。
7.  **完成回调**: 更新任务状态，记录下载链接。

## 5. 托管与运行管理 (Hosting & Process Management)

为了支持服务重启后的自愈（Rehydration）以及批量管理，Builder Service 需要维护一个运行实例数据库。

### 5.1 数据库设计 (Instance Table)

在 SQLite 或 PostgreSQL 中维护 `instances` 表：

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | 实例唯一标识 |
| `agent_id` | String | 对应的 Agent ID |
| `job_id` | String | 关联的构建任务 ID (用于定位二进制产物) |
| `port` | Integer | 运行端口 |
| `pid` | Integer | 操作系统进程 ID |
| `status` | Enum | `running`, `stopped`, `error` |
| `auto_restart` | Boolean | 是否随系统启动自动拉起 |
| `created_at` | DateTime | 创建时间 |

### 5.2 批量启动逻辑 (Batch Startup)

当 Agent Builder Service 容器/服务启动时，执行以下初始化逻辑：

1.  **读取数据库**: 查询所有 `status='running'` 或 `auto_restart=true` 的记录。
2.  **校验产物**: 检查对应的二进制文件是否存在。
3.  **批量拉起**: 
    -   遍历记录，使用 `Bun.spawn` 或 `child_process.spawn` 启动进程。
    -   更新数据库中的 `pid` (因为重启后 PID 会变)。
    -   **端口冲突处理**: 如果原端口被占用，尝试分配新端口并更新数据库。
4.  **健康检查**: 启动后轮询 `/api/status` 确认服务存活。

## 6. 运行时行为 (Runtime Behavior)

生成的二进制文件在用户机器上运行时的行为：

1.  **端口分配**: 自动寻找可用端口（默认 3000，若占用则递增）。
2.  **启动服务**: 启动内置的 Bun HTTP Server。
3.  **信息输出**: 控制台打印运行端口、Meta 信息（如 Agent 名称、版本）。
4.  **加载 UI**: 自动打开浏览器访问 `http://localhost:{port}`。
5.  **交互执行**: React 应用直接发起网络请求调用远程 Skill API。
6.  **版本检查**:
    -   App 启动时异步请求 `updateUrl`。
    -   如果发现新版本，UI 顶部显示“发现新版本 v1.0.x，点击下载”。
    -   用户点击后跳转浏览器下载新版二进制。

## 7. 开发计划

1.  **Phase 1: Builder Project 初始化**
    -   建立 `projects/agent-builder` (暂定名)。
    -   实现基础的接收构建请求 API。
2.  **Phase 2: 代码生成器实现**
    -   实现基于配置生成 React 代码的逻辑。
    -   实现 Skill API 调用代码的自动生成与注入。
3.  **Phase 3: Bun 集成**
    -   调试 `bun build --compile` 在服务端的执行环境。
    -   解决静态资源嵌入二进制的问题。
4.  **Phase 4: 托管管理 (Process Manager)**
    -   集成 SQLite/PG。
    -   实现实例启动、停止、批量恢复逻辑。
5.  **Phase 5: 端到端联调**
    -   从 `projects/app` 发起请求，直到下载并运行二进制文件。

## 8. 示例：生成的代码结构

```text
/tmp/build-job-123/
├── package.json
├── bun.lockb
├── public/              <-- 构建好的静态资源
│   ├── index.html
│   └── assets/
├── src/
│   ├── components/      <-- 生成的 UI 组件
│   ├── skills/          <-- 生成的 Skill API 调用函数
│   │   └── weather.ts
│   └── App.tsx
└── server.ts            <-- Bun 原生入口文件 (将被编译为二进制)
```

## 9. 示例代码 (Bun Native Server)

```typescript
// server.ts
import { file } from "bun";

const port = 3000;

Bun.serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    
    // 1. Static File Serving (Basic)
    let path = url.pathname;
    if (path === "/") path = "/index.html";
    
    // Check if file exists in public folder
    const filePath = `./public${path}`;
    const staticFile = file(filePath);
    
    // Note: In real implementation, need to handle mime types and 404 correctly
    // or use a minimal static file helper
    if (staticFile.size > 0) {
       return new Response(staticFile);
    }

    // 2. SPA Fallback (Return index.html for client-side routing)
    return new Response(file("./public/index.html"));
  },
});

console.log(`AgentUI running at http://localhost:${port}`);
// TODO: Auto open browser logic
```
