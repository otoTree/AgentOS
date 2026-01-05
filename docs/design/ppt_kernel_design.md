# AgentOS 云端 PPT 幻灯片微内核 (PPT-Kernel) 设计文档

## 1. 概述

本文档旨在设计一个轻量级、模块化且面向 AI Agent 深度优化的云端 PPT 微内核。该内核将被封装在 `@agentos/ppt-kernel` 包中，负责 PPT 的数据结构定义、解析、渲染以及面向 Agent 的原子化操作接口。

### 1.1 设计目标
- **微内核架构**: 核心负责幻灯片树（Slide Tree）的状态管理和元素索引，解析器、渲染器、导出器均作为插件存在。
- **Agent 友好**: 提供高度抽象的语义化 API（如 `addBulletPoints`, `replaceImageByTopic`），而非仅仅是低级的坐标操作。
- **多端渲染**: 支持 Web 端（SVG/Canvas）实时预览，并能生成 Agent 可读的幻灯片大纲（Markdown/JSON）。
- **PPTX 兼容**: 能够解析标准的 `.pptx` (OpenXML) 文件并保留其核心结构。
- **声明式驱动**: 支持通过 JSON 配置或 DSL 描述直接生成幻灯片内容。

---

## 2. 架构设计

采用“数据中心化，功能插件化”的架构，确保内核的纯净与可扩展性。

### 2.1 核心组件 (Core)
- **Store (状态管理)**: 维护 Presentation -> Slide -> Element 的层级结构，采用不可变数据流。
- **Command Bus (命令总线)**: 所有对 PPT 的修改必须通过 Command 执行（如 `AddSlideCommand`, `MoveElementCommand`），天然支持 Undo/Redo 和操作审计。
- **Element Registry**: 注册不同类型的幻灯片元素（文本框、图片、形状、图表、表格）。
- **Layout Engine**: 负责幻灯片母版（Master）与布局（Layout）的继承逻辑。

### 2.2 插件系统 (Plugins)
- **PPTX Parser**: 基于 `jszip` 解析 OpenXML 结构，提取幻灯片、样式、媒体资源。
- **Renderer**:
    - **SVG Renderer**: 默认 Web 渲染方案，支持缩放和交互。
    - **Thumbnail Renderer**: 快速生成预览图。
    - **Agent Outline Renderer**: 将 PPT 转换为层级化的文本大纲。
- **Exporter**: 导出为 `.pptx` (利用 `pptxgenjs` 逻辑或原生 XML 组装)。

---

## 3. 目录结构

```text
packages/ppt-kernel/
├── src/
│   ├── core/           # 内核核心 (Store, Command Bus, Element Registry)
│   ├── model/          # 数据模型 (Presentation, Slide, Shape, Theme)
│   ├── parser/         # PPTX 解析逻辑 (OpenXML 映射)
│   ├── renderer/       # 渲染适配器 (SVG, Canvas, Text)
│   ├── plugins/        # 扩展插件 (Animations, SmartArts)
│   ├── agent/          # 面向 Agent 的语义化能力封装
│   ├── shared/         # 几何计算、颜色工具
│   └── index.ts        # 入口 API
├── tests/              # 单元测试与解析测试
├── package.json
└── tsconfig.json
```

---

## 4. 数据模型 (PPT Schema)

PPT 数据模型以“元素树”为核心，每个元素具备几何属性和内容属性。

### 4.1 核心结构
```typescript
type PresentationState = {
  id: string;
  title: string;
  slides: SlideData[];
  masters: MasterSlide[]; // 母版
  layouts: LayoutData[]; // 布局
  theme: ThemeConfig;    // 主题（颜色、字体）
};

type SlideData = {
  id: string;
  layoutId: string;
  elements: Element[];
  background?: BackgroundConfig;
  notes?: string;        // 演讲者备注（Agent 交互的重要上下文）
};

type ElementType = 'text' | 'image' | 'shape' | 'chart' | 'table' | 'group';

type Element = {
  id: string;
  type: ElementType;
  x: number; // 相对坐标 0-1000 或像素
  y: number;
  w: number;
  h: number;
  rotation?: number;
  opacity?: number;
  style: ElementStyle;
  content: any; // 根据 type 不同，如 TextContent, ImageSource
};
```

---

## 5. 面向 Agent 的底层能力 (Agent API)

这是 PPT 内核区别于传统编辑器的核心点：**将复杂的视觉排版抽象为 Agent 可理解的操作**。

### 5.1 语义化操作接口
- `getPresentationOutline()`: 返回整个 PPT 的 Markdown 大纲，包含每页标题、正文、备注。
- `addSlideWithLayout(concept: string)`: Agent 给出概念（如“核心优势”），内核自动选择匹配的布局并插入。
- `updateTextByPlaceholder(slideId: string, placeholderName: string, text: string)`: 根据占位符名称更新内容。
- `generateSmartLayout(slideId: string, data: any[])`: 自动将一组列表数据排版为精美的网格或时间轴。

### 5.2 视觉与语义对齐
- **Auto-Bounding**: 当 Agent 插入长文本时，内核自动计算溢出并调整字体大小或分页。
- **Style Injection**: Agent 只需指定 `style: "emphasis"`，内核根据当前主题自动映射为对应的颜色和加粗。

---

## 6. PPTX 解析策略

- **OpenXML 结构映射**:
    - `ppt/slides/slideN.xml` -> `SlideData`
    - `ppt/theme/theme1.xml` -> `ThemeConfig`
    - `ppt/media/` -> 处理图片、视频资源的引用。
- **流式加载**: 优先解析第一页和目录，媒体资源在需要时异步加载。

---

## 7. 典型 Agent 交互场景

### 7.1 场景一：根据大纲生成 PPT
**Agent 调用**:
```typescript
const kernel = new PPTKernel();
await kernel.applyOutline(`# 季度汇报\n## 1. 业务现状\n- 增长 20%\n- 利润稳健`);
// 内核逻辑：
// 1. 创建标题页，填充“季度汇报”
// 2. 创建列表页，填充“业务现状”及其子项
```

### 7.2 场景二：智能图表转换
**Agent 目标**: 将一段数据转换为图表。
**内核接口**:
```typescript
await kernel.insertElement(slideId, {
  type: 'chart',
  chartType: 'bar',
  data: [ { category: 'A', value: 10 }, ... ],
  style: 'minimal'
});
```

---

## 8. 协作与持久化

- **CRDT 集成**: 核心 Store 支持对接 `Yjs`，实现元素级别的冲突解决，支持多人同时编辑同一页幻灯片。
- **媒体资源管理**: PPT 中的图片、视频统一由 OSS 托管，内核仅存储其 `resourceId` 或 `URL`。
- **版本控制**: 基于 Command Log 实现精细的版本回溯。

---

## 9. 实施路线图

1. **Phase 1 (基础)**: 定义 PPT 核心数据结构与 Store。
2. **Phase 2 (解析器)**: 实现基础 PPTX 文件的 XML 解析，提取文本和图片。
3. **Phase 3 (渲染器)**: 开发 Web 端 SVG 渲染引擎，支持基础元素的显示。
4. **Phase 4 (Agent 工具集)**: 开发大纲解析、占位符填充等 Agent 专用接口。
5. **Phase 5 (完善)**: 支持复杂形状、简单动画和导出功能。
