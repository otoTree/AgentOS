# 技术优化指导文档：Neural Runtime 系统重构与优化

## 1. 代码现状分析

### 1.1 整体架构说明
Neural Runtime 是一个基于 Next.js 构建的 AI 基础设施平台，采用现代化的全栈架构。
*   **前端框架**: Next.js (App Router)，使用 React Server Components 和 Client Components 混合模式。
*   **样式方案**: Tailwind CSS，配合 Lucide React 图标库。
*   **数据库**: Prisma ORM 连接 PostgreSQL (推测)，数据模型包含 User, Project, Deployment, AgentConversation, File, Folder 等核心实体。
*   **核心功能模块**:
    *   **Agent System**: 包含对话管理、工具调用、上下文管理 (`src/app/agent`).
    *   **File System**: 虚拟文件系统，支持文件上传、管理、S3 存储 (`src/app/dashboard/files`, `src/lib/file-storage.ts`).
    *   **Browser Sandbox**: 基于远程浏览器的沙箱环境，提供导航、截图、交互能力 (`src/app/api/browser`).
    *   **FaaS Engine**: 部署和执行用户代码 (`src/app/api/run`).
    *   **Marketplace**: 工具和项目市场 (`src/app/marketplace`).

### 1.2 已识别的冗余代码
经过代码审查，在以下区域发现了显著的重复逻辑：

*   **API 路由中的身份验证与错误处理**:
    *   `src/app/api/folders/route.ts`
    *   `src/app/api/files/[id]/route.ts`
    *   `src/app/api/folders/[id]/route.ts`
    *   `src/app/api/files/route.ts`
    *   表现形式：每个路由处理函数开头都重复调用 `getAuthenticatedUser()` 并手动检查 `if (!user) return 401`。错误处理 `try-catch` 块中大量重复的 `console.error` 和 `500` 响应代码。

*   **文件系统重名检查逻辑**:
    *   `src/app/api/folders/route.ts` (POST)
    *   `src/app/api/folders/[id]/route.ts` (PATCH)
    *   `src/app/api/files/[id]/route.ts` (PATCH)
    *   表现形式：手动构建查询来检查 `userId`, `parentId/folderId`, `name` 的组合是否存在，逻辑高度相似。

*   **浏览器沙箱 API 代理**:
    *   `src/app/api/browser/content/route.ts`
    *   `src/app/api/browser/tabs/route.ts`
    *   `src/app/api/browser/action/route.ts`
    *   `src/app/api/browser/navigate/route.ts`
    *   `src/app/api/browser/session/route.ts`
    *   表现形式：所有路由都重复了 `SANDBOX_API_URL` 和 `AUTH_TOKEN` 的环境变量读取，以及对 upstream fetch 的错误处理（检查 `res.ok`，解析 JSON 或 text，转发错误状态码）。

*   **数据获取与查询逻辑**:
    *   `src/app/dashboard/files/actions.ts` 与 `src/app/api/files/route.ts` 中存在重复的 Prisma 查询构建逻辑（搜索过滤、文件夹过滤）。

### 1.3 影响评估
*   **维护成本高**: 修改身份验证逻辑或沙箱 API URL 需要修改十几个文件，容易遗漏。
*   **Bug 风险**: 重名检查逻辑在不同端点稍微不一致可能导致数据一致性问题。
*   **代码膨胀**: 大量样板代码降低了核心业务逻辑的可读性。

## 2. 优化目标与原则

### 2.1 优化目标
*   **代码简化**: 减少 30% 以上的 API 路由样板代码。
*   **一致性**: 统一错误处理格式和身份验证流程。
*   **可维护性**: 将沙箱代理逻辑集中到一个适配器/客户端中。

### 2.2 基本原则
*   **DRY (Don't Repeat Yourself)**: 任何重复 3 次以上的逻辑必须提取为公共函数或组件。
*   **单一职责**: API 路由只负责 HTTP 协议转换（Request -> Controller -> Response），业务逻辑下沉到 Service 层。
*   **组合优于继承**: 使用高阶函数或 Hooks 组合功能。

## 3. 优化实施方案

### 3.1 模块化优化建议

#### A. API 路由与中间件
*   **方案**: 引入 `withAuth` 高阶函数或中间件包装器。
*   **目标**: 自动处理 `getAuthenticatedUser` 和 401 响应。

#### B. 浏览器沙箱客户端
*   **方案**: 创建 `SandboxClient` 类或单例模块。
*   **目标**: 封装 `fetch` 调用、Base URL 配置、Token 注入和统一错误处理。所有 browser API 路由仅需调用此客户端的方法。

#### C. 文件系统服务
*   **方案**: 提取 `FileSystemService`。
*   **目标**: 将 `createFolder`, `updateFile`, `checkDuplicate` 等逻辑从 API 路由移动到 Service 层。

### 3.2 具体技术方案示例

#### 3.2.1 统一 API 处理包装器 (Higher-Order Function)
```typescript
// src/lib/api-handler.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helper";

type AuthenticatedHandler = (
  req: NextRequest, 
  context: { user: any, params: any }
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest, { params }: { params: any }) => {
    try {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return await handler(req, { user, params });
    } catch (error: any) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: error.message || "Internal Server Error" }, 
        { status: 500 }
      );
    }
  };
}
```

#### 3.2.2 沙箱 API 客户端
```typescript
// src/lib/sandbox-client.ts
const SANDBOX_API_URL = process.env.SANDBOX_API_URL || "http://localhost:8080";
const AUTH_TOKEN = process.env.SANDBOX_AUTH_TOKEN;

class SandboxClient {
  private async request(path: string, options: RequestInit = {}) {
    const url = `${SANDBOX_API_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      throw new Error(`Sandbox API Error: ${res.status} ${await res.text()}`);
    }
    return res;
  }

  async getSessionContent(sessionId: string, tabId?: string) {
    // ... implementation
  }
  
  async navigate(sessionId: string, url: string, tabId?: string) {
    // ... implementation
  }
}

export const sandboxClient = new SandboxClient();
```

## 4. 实施步骤指南

### 阶段一：基础架构重构 (预计 1-2 天)
1.  **创建 `src/lib/api-utils.ts`**: 实现 `withAuth` 和统一错误处理 helper。
2.  **创建 `src/lib/sandbox-service.ts`**: 封装所有对 Sandbox 的远程调用。
3.  **创建 `src/services/file-service.ts`**: 迁移文件/文件夹的 CRUD 和重名检查逻辑。

### 阶段二：API 路由迁移 (预计 2-3 天)
1.  **迁移 Browser API**: 将 `src/app/api/browser/*` 下的所有路由改写为调用 `sandbox-service`。
2.  **迁移 Files/Folders API**: 将 `src/app/api/files`和 `folders` 改写为使用 `withAuth` 和 `file-service`。
3.  **验证**: 使用 Postman 或现有前端测试各功能点是否正常。

### 阶段三：清理与规范化 (预计 1 天)
1.  **删除冗余代码**: 移除 API 路由中不再使用的局部 helper 函数。
2.  **Lint 检查**: 运行 ESLint 确保代码风格统一。

### 版本控制与回滚
*   在开始前创建新分支 `refactor/optimization-v1`。
*   每个阶段完成后进行一次 Commit。
*   如果发现 API 行为异常，直接回退到上一个 Commit 点。

## 5. 质量保障措施

### 5.1 性能指标
*   **代码行数**: 预期减少 API 目录 30% 代码量。
*   **响应时间**: 理论上由于减少了冗余逻辑，响应时间应持平或微降（忽略函数调用开销）。

### 5.2 Code Review 清单
*   [ ] 是否所有受保护路由都使用了 `withAuth`？
*   [ ] 所有的 `SANDBOX_API_URL` 引用是否都已移除，只保留在 Service 中？
*   [ ] 错误响应格式是否统一为 `{ error: string }`？
*   [ ] 重名检查逻辑是否覆盖了并发情况（虽然 Prisma 事务是更好的选择，但 Service 层封装至少保证逻辑统一）？

## 6. 风险控制

### 6.1 潜在风险
*   **API 契约变更**: 统一错误处理可能会改变部分 API 返回的 HTTP 状态码或错误消息格式，导致前端处理失败。
    *   *应对*: 保持 `withAuth` 中的错误返回结构与现状兼容（目前主要是 `{ error: message }`）。
*   **鉴权漏斗**: 如果 `withAuth` 封装有误，可能导致所有接口鉴权失效。
    *   *应对*: 编写单元测试专门测试 `withAuth` 的 401 逻辑。

### 6.2 灰度策略
*   本项目为后端逻辑重构，建议按模块灰度：先上线 Browser API 的重构（风险较低），稳定后再上线 File System 的重构（涉及核心数据）。
