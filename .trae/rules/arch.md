
## 输出要求

1. 输出语言：中文

## 项目概述

AgentOS 是一个 AI Agent 构建平台,通过 Flow 提供开箱即用的数据处理、模型调用能力和可视化工作流编排。这是一个基于 NextJS 构建的全栈 TypeScript 应用。

**技术栈**: NextJS 14.2.2 + TypeScript + shadcn/ui + PostgreSQL（业务数据） + PostgreSQL （向量数据库）(PG Vector)/Milvus + OSS（对象存储，s3协议）+ zod

## 架构

这是一个使用 pnpm workspaces 的 monorepo,主要结构如下:

### Packages (库代码)
- `packages/global/` - 所有项目共享的类型、常量、工具函数
- `packages/service/` - 后端服务、数据库模型、API 控制器、工作流引擎
- `packages/web/` - 共享的前端组件、hooks、样式、国际化
- `packages/templates/` - 模板市场的应用模板

### Projects (应用程序)
- `projects/app/` - 主 NextJS Web 应用(前端 + API 路由)
- `projects/admin/` - NextJS 管理后台服务
- `projects/sandbox/` - express,用来实现 skill 快速部署 考虑使用 python 作为基础环境

### 关键目录
- `document/` - 文档站点(NextJS 应用及内容)
- `plugins/` - 外部插件(模型、爬虫等)
- `deploy/` - Docker 和 Helm 部署配置
- `test/` - 集中的测试文件和工具

## 开发命令

### 主要命令(从项目根目录运行)
- `pnpm dev` - 启动所有项目的开发环境(使用 package.json 的 workspace 脚本)
- `pnpm run build` - 构建所有项目
- `pnpm test` - 使用 Vitest 运行测试
- `pnpm test:workflow` - 运行工作流相关测试
- `pnpm lint` - 对所有 TypeScript 文件运行 ESLint 并自动修复
- `pnpm format-code` - 使用 Prettier 格式化代码

### 项目专用命令
**主应用 (projects/app/)**:
- `cd projects/app && pnpm dev` - 启动 NextJS 开发服务器
- `cd projects/app && pnpm run build` - 构建 NextJS 应用
- `cd projects/app && pnpm start` - 启动生产服务器



**沙箱 (projects/sandbox/)**:
- `cd projects/sandbox && pnpm dev` - 以监视模式启动 NestJS 开发服务器
- `cd projects/sandbox && pnpm run build` - 构建 NestJS 应用
- `cd projects/sandbox && pnpm test` - 运行 Jest 测试



**管理后台 (projects/admin/)**:
- `cd projects/admin && pnpm dev` - 启动 NextJS 开发服务器
- `cd projects/admin && pnpm run build` - 构建 NextJS 应用
- `cd projects/admin && pnpm start` - 启动生产服务器



### 工具命令
- `pnpm create:i18n` - 生成国际化翻译文件
- `pnpm api:gen` - 生成 OpenAPI 文档
- `pnpm initIcon` - 初始化图标资源
- `pnpm gen:theme-typings` - 生成 Chakra UI 主题类型定义

## 测试

项目使用 Vitest 进行测试并生成覆盖率报告。主要测试命令:
- `pnpm test` - 运行所有测试
- `pnpm test:workflow` - 专门运行工作流测试
- 测试文件位于 `test/` 目录和 `projects/app/test/`
- 覆盖率报告生成在 `coverage/` 目录

## 代码组织模式

### Monorepo 结构
- 共享代码存放在 `packages/` 中,通过 workspace 引用导入
- `projects/` 中的每个项目都是独立的应用程序
- 使用 `@agentos/global`、`@agentos/service`、`@agentos/web` 导入共享包

### API 结构
- NextJS API 路由在 `projects/app/src/pages/api/`
- API 路由合约定义在`packages/global/openapi/`, 对应的
- 通用服务端业务逻辑在 `packages/service/`和`projects/app/src/service`
- 数据库模型在 `packages/service/` 中,使用 MongoDB/Mongoose

### 前端架构
- React 组件在 `projects/app/src/components/` 和 `packages/web/components/`
- 使用 shadcn UI 进行样式设计,自定义主题在 `packages/web/styles/theme.ts`
- 国际化支持文件在 `packages/web/i18n/`
- 使用 React Context 和 Zustand 进行状态管理

## 开发注意事项

- **Node 版本**: 需要 Node.js 18+
- **包管理器**: 使用 pnpm 及 workspace 配置
- **数据库**: 支持 PostgreSQL、OSS、带 pgvector 的 PostgreSQL 或 Milvus 向量存储
- **AI 集成**: 通过统一接口支持多个 AI 提供商
- **国际化**: 完整支持中文、英文和日文

## 关键文件模式

- `.ts` 和 `.tsx` 文件全部使用 TypeScript
- 数据库模型使用 drizzle、pg 配合 TypeScript
- API 路由遵循 NextJS 约定
- 组件文件使用 React 函数式组件和 hooks
- 共享类型定义在 `packages/global/` 的 `.d.ts` 文件中

## 环境配置

- 支持特定环境配置
- 模型配置在 `packages/service/core/ai/config/`

## 代码规范

- 尽可能使用 type 进行类型声明，而不是 interface。

## Agent 设计规范

1. 对于功能的实习和复杂问题修复，优先进行文档设计，并于让用户确认后，再进行执行修复。
2. 采用"设计文档-测试示例-代码编写-测试运行-修正代码/文档"的工作模式，以测试为核心来确保设计的正确性。

## 美术规范

<icons>
default: lucide-react (UI icons)
brand: react-icons (FcGoogle, FaGithub, GiYinYang)
custom: shared/icons/ when needed
priority: lucide → react-icons → custom
</icons>

<component-structure>
principle: high cohesion + low coupling
high cohesion: component manages own data, animation, styling internally
low coupling: minimize props | fetch own data (useTranslations, hooks) | ✗ receive pre-processed data as props
exception: generic reusable components → accept data via props
</component-structure>

<styling>
principle: prefer props to control behavior | modify base when semantics require (e.g., div → span)
pattern: add size/variant props → caller decides | keep base defaults stable when possible
variants: use cva (class-variance-authority) for variant styles | ✗ multiple if statements
</styling>

<cursor>
types: default | pointer | text | not-allowed
default: text content | non-interactive elements
pointer: all interactive elements (button, link, clickable) + their children
text: input fields (text, email, password, textarea, contenteditable)
not-allowed: disabled elements (:disabled, aria-disabled)
✗ use: grab | crosshair | other cursor types
</cursor>

<theme>
mode: light only | ✗ dark mode
colors: black text on white/gray bg | use opacity for hierarchy (text-black/50, text-black/70)
✗ use: dark: variant | bg-zinc-900 | text-white on dark bg
</theme>

<color-system>
format: OKLCH preferred | oklch(L C H) where L=lightness C=chroma H=hue
base: pure white bg (#fff) + pure black text (#000)
hierarchy: opacity-based (text-black/40 → /50 → /60 → /70 → /80 → black)
section-bg: oklch(0.985 0 0) ≈ zinc-50 (alternating section background)
accent: ✗ colored accents | use black/white only
border: black/[0.04-0.08] (subtle borders)
shadow: rgba(0,0,0,0.04-0.12) (delicate shadows)
success: emerald-500 (status indicator only)
mode-colors:
  - auto: oklch(0.55 0.01 60) stone gray
  - fortune: oklch(0.7 0.1 290) light violet
  - listen: oklch(0.75 0.08 165) light emerald
  - divination: oklch(0.7 0.1 290) light violet
</color-system>

<aesthetic>
direction: Eastern Editorial Minimalism
tone: light & serene | breathing whitespace | refined restraint
inspiration: magazine editorial layout + ink-wash painting aesthetics
character: modern minimalism as foundation | eastern elegance as soul | east-west fusion
✗ avoid: heavy shadows | saturated colors | busy decoration | generic AI aesthetics
</aesthetic>
