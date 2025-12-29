# 用户鉴权系统设计 (Authentication System Design)

## 1. 概述
本设计旨在为 AgentOS 提供基于 NextAuth.js 的用户鉴权机制，支持账号密码登录、会话管理及登出功能。

## 2. 数据库设计 (Database Schema)
基于 `packages/service/database/schema.ts` 现有的 `users` 表进行扩展。

### Users Table
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID | 主键, defaultRandom |
| name | Text | 用户名 |
| email | Text | 邮箱 (Unique) |
| password | Text | 加密后的密码 (新增) |
| avatar | Text | 用户头像 URL (新增, 可选) |
| created_at | Timestamp | 创建时间 |
| updated_at | Timestamp | 更新时间 |

## 3. 鉴权流程 (Authentication Flow)

### 3.1 技术选型
- **框架**: NextAuth.js (v4)
- **策略**: Credentials Provider (账号密码)
- **加密**: bcryptjs
- **Session**: JWT Strategy (无状态，适合分布式/Serverless)

### 3.2 登录 (Login)
1. 用户在前端输入邮箱和密码。
2. 前端调用 `signIn('credentials', { email, password })`。
3. 后端 `authorize` 回调：
   - 根据 email 查询 `users` 表。
   - 使用 `bcryptjs.compare` 校验密码。
   - 校验通过返回 User 对象（不含密码）。
   - 校验失败抛出错误。

### 3.3 会话 (Session)
- 使用 JWT 存储 Session 信息。
- `jwt` 回调：将 User ID 写入 Token。
- `session` 回调：从 Token 读取 User ID 并注入 Session 对象，供前端 `useSession` 使用。

### 3.4 登出 (Logout)
- 前端调用 `signOut()`。
- 清除客户端 Cookie。

## 4. API 设计

### 4.1 NextAuth Endpoints
- `GET/POST /api/auth/[...nextauth]`
  - 处理登录、登出、Session 获取。

### 4.2 注册 (Register - 辅助功能)
- `POST /api/auth/register`
  - Body: `{ email, password, name }`
  - 逻辑: 检查邮箱是否存在 -> 加密密码 -> 写入数据库。

## 5. 前端设计

### 5.1 页面
- `/login`: 登录页面
- `/register`: 注册页面 (用于初始化用户)

### 5.2 组件
- 导航栏增加用户头像下拉菜单，包含“登出”选项。
