# AgentOS 架构规范 (混合云/本地架构)

## 1. 概览
AgentOS 正在向混合架构转型，该架构利用本地计算资源进行执行 (Desktop)，同时保留中心化的控制平面用于协作、权限管理和技能管理 (Cloud)。

## 2. 组件

### 2.1. 服务端 (Cloud Control Plane)
*   **技术栈**: Express.js + TypeScript (新项目)
*   **角色**: 中心化的“大脑”和“单一事实来源 (Source of Truth)”。
*   **职责**:
    *   **认证与用户管理**: 处理用户登录、会话和团队管理。
    *   **RBAC (基于角色的访问控制)**: 定义谁可以做什么 (系统级 & 项目级)。
    *   **技能注册中心 (Skill Registry)**: 存储技能定义、配置和版本控制。
    *   **Agent/模型配置**: LLM 提供商配置和系统提示词的中心存储。
    *   **任务/会话状态**: 聊天记录和任务执行日志的持久化 (用于云端历史记录)。
    *   **数据集/文件元数据**: 管理上传文件的元数据 (物理文件可能存储在 S3/Blob 中)。
*   **交互**:
    *   暴露 REST API (例如 `/api/v1/...`)。
    *   桌面端和 Web 客户端均通过此服务器进行身份验证。

### 2.2. 桌面客户端 (Local Compute Plane)
*   **技术栈**: Electrobun (Bun + Chromium) + React
*   **角色**: 高级用户的主要工作区，利用本地资源。
*   **职责**:
    *   **UI**: 提供聊天 (Chat)、工作台 (Workbench) 和管理 (Admin) 界面 (从 App 移植)。
    *   **本地执行**: 使用用户的本地 CPU/GPU/环境运行任务。
    *   **本地沙箱管理器 (Local Sandbox Manager)**:
        *   启动并管理本地的 `Sandbox Service` 实例。
        *   管理本地 Python 虚拟环境 (`python-venv`)。
    *   **本地文件系统访问**: 直接读写用户指定的本地文件夹。
    *   **同步**:
        *   从云端服务器拉取技能/Agent 定义。
        *   异步将执行日志/结果推送到云端服务器 (可选/异步)。
*   **核心优势**: 本地文件零延迟，无云端计算成本，本地任务完全隐私。

### 2.3. Web 应用 (Cloud Client)
*   **技术栈**: Next.js (现有的 `projects/app`)
*   **角色**: 随时随地可访问的界面和管理后台。
*   **状态**:
    *   保留其 UI 组件。
    *   保留 后端 api 路由 (`/pages/api`)。

### 2.4. 沙箱服务 (Execution Engine)
*   **技术栈**: Express.js + Python (现有的 `projects/sandbox`)
*   **角色**: 执行代码的“肌肉”。
*   **双模式**:
    *   **云模式**: 作为微服务部署在云端。水平扩展。通过 Token 保护。
    *   **本地模式**: 与桌面端打包。运行在 localhost。通过 localhost 绑定 + Token 保护。
*   **接口**: 标准 HTTP API (`POST /execute`)。保持不变。

## 3. 数据流

### 场景 A: 桌面用户运行技能
1.  **认证**: 桌面端登录到 `Server` (云端) -> 获取 JWT。
2.  **配置**: 桌面端从 `Server` 拉取技能定义 + 模型配置。
3.  **输入**: 用户在桌面 UI 输入提示词。
4.  **执行**:
    *   桌面应用 (主进程) 调用 **本地** `Sandbox Service` (`localhost:port/execute`)。
    *   沙箱在本地 `venv` 中运行 Python 代码。
    *   结果返回给桌面 UI。
5.  **同步**: 桌面端异步将“运行记录”推送到 `Server` 用于审计/历史记录 (如果在线)。

### 场景 B: Web 用户运行技能
1.  **认证**: 用户登录 Web 应用 (Next.js) -> `Server`。
2.  **执行**:
    *   Web UI -> Next.js API -> `Server` API。
    *   `Server` 验证 RBAC。
    *   `Server` 将作业分发到 **云端** `Sandbox Service`。
    *   结果返回给 Server -> Next.js -> Web UI。

## 4. 迁移计划

1.  **阶段 1: 基础建设**
    *   初始化 `projects/server` (Express)。
    *   将认证/用户/技能 Schema 和逻辑从 Next.js 拷贝到 Express。
2.  **阶段 2: 桌面端原型**
    *   让 `projects/desktop` 运行起来并加载 React UI。
    *   在桌面端实现本地沙箱启动逻辑。
3.  **阶段 3: 集成**
    *   将桌面端连接到云端服务器进行认证。
    *   将桌面端连接到本地沙箱进行运行。
