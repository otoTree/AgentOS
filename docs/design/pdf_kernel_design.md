# AgentOS 云端 PDF 微内核 (PDF-Kernel) 设计文档

## 1. 概述

本文档旨在设计一个轻量级、高性能且面向 AI Agent 深度优化的云端 PDF 微内核。该内核将被封装在 `@agentos/pdf-kernel` 包中，负责 PDF 数据的解析、渲染、结构化提取以及面向 Agent 的原子化操作接口。

### 1.1 设计目标
- **微内核架构**: 核心负责 PDF 文档对象模型（DOM）的状态管理，解析引擎、渲染引擎、导出器均作为插件存在。
- **Agent 优先**: 提供强大的语义化能力，如“提取第 N 页的表格”、“搜索包含特定关键词的段落”、“在指定位置添加批注”。
- **高性能解析**: 支持流式加载和按需解析，能够处理超大 PDF 文件而不阻塞主线程。
- **多模态对齐**: 将 PDF 中的视觉布局信息（坐标、字体、颜色）与语义信息（标题、正文、表格）对齐，方便 LLM 理解。
- **跨平台渲染**: 支持 Web 端（Canvas/SVG）高质量渲染，并能生成 Agent 可读的纯文本或 Markdown 视图。

---

## 2. 架构设计

采用插件化架构，解耦核心逻辑与具体的库实现（如 PDF.js）。

### 2.1 核心组件 (Core)
- **Document Store**: 维护 PDF 的层级结构（Catalog -> Pages -> Resources -> Annotations）。
- **Event Bus**: 处理文档加载、解析进度、元素点击等事件。
- **Coordinate System**: 统一 PDF 点位（Points）与 Web 像素（Pixels）的转换逻辑。
- **Selection Manager**: 维护用户的选择状态和 Agent 的聚焦区域。

### 2.2 插件系统 (Plugins)
- **PDF Parser**: 基于 `pdf.js` 或 `pdf-lib` 解析二进制流，提取文本内容、字体元数据、层级结构。
- **Renderer**:
    - **Canvas Renderer**: 用于 Web 端高性能交互式显示。
    - **Agent View Renderer**: 将 PDF 页面转换为带坐标信息的结构化 Markdown。
- **Extraction Engine**: 专门用于复杂结构（如表格、公式、目录）的识别与提取。
- **Annotation Engine**: 负责批注（Highlight, Comment, Form Fill）的 CRUD。

---

## 3. 目录结构

```text
packages/pdf-kernel/
├── src/
│   ├── core/           # 内核核心 (Store, EventBus, Coordinate)
│   ├── model/          # 数据模型 (Document, Page, TextLayer, Annotation)
│   ├── parser/         # 解析逻辑 (基于 PDF.js 的封装)
│   ├── renderer/       # 渲染适配器 (Canvas, SVG, Markdown)
│   ├── extractor/      # 结构化提取 (Table, Image, Catalog)
│   ├── agent/          # 面向 Agent 的语义化能力封装
│   ├── shared/         # 字节处理、数学计算工具
│   └── index.ts        # 入口 API
├── tests/              # 单元测试与基准测试
├── package.json
└── tsconfig.json
```

---

## 4. 数据模型 (PDF Schema)

PDF-Kernel 采用虚拟 DOM 思想，将原始 PDF 映射为可操作的对象模型。

### 4.1 核心结构
```typescript
type PDFDocumentState = {
  id: string;
  metadata: PDFMetadata;
  pages: PDFPageData[];
  catalog: PDFOutlineNode[]; // 目录结构
  permissions: PDFPermissions;
};

type PDFPageData = {
  pageNumber: number;
  viewBox: [number, number, number, number]; // [x, y, width, height]
  rotation: number;
  textLayer: TextItem[];
  annotations: Annotation[];
  images: ImageInfo[];
  tables?: TableData[]; // 经过解析引擎识别后的表格
};

type TextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  hasNewline: boolean;
};

type Annotation = {
  id: string;
  type: 'highlight' | 'text' | 'ink' | 'link';
  rect: [number, number, number, number];
  color: string;
  content?: string;
  author?: string;
};
```

---

## 5. 面向 Agent 的底层能力 (Agent API)

这是 PDF-Kernel 的核心价值所在，将“像素级”操作提升为“语义级”操作。

### 5.1 语义提取接口
- `getStructuredText(pageRange?: string)`: 获取带层级标记的文本，自动识别标题和段落。
- `extractTables(pageNumber: number)`: 识别并返回页面中的所有表格，转换为 JSON 格式。
- `findOccurrences(query: string)`: 全文搜索关键词，返回包含坐标和页面信息的列表。
- `summarizePage(pageNumber: number)`: 为 Agent 提供页面的视觉摘要（如：左上角是 Logo，中间是正文，右下角有页码）。

### 5.2 交互与修改接口
- `addHighlight(rect: Rect, comment: string)`: 在指定视觉区域添加高亮和评论。
- `fillForm(data: Record<string, string>)`: 自动填充 PDF 表单字段。
- `exportSelectionAsImage(rect: Rect)`: 将特定区域导出为图片，供 Agent 进行视觉分析（OCR/VLM）。

### 5.3 导航接口
- `scrollToElement(elementId: string)`: 联动渲染器，自动滚动到 Agent 关注的内容。
- `getContextAround(textId: string, range: number)`: 获取特定文本块周围的上下文信息。

---

## 6. 解析与渲染策略

- **流式解析 (Streaming)**: 利用 Web Workers 异步解析 PDF，不阻塞 UI。
- **分层渲染 (Layered Rendering)**:
    1. **Bottom**: Canvas 渲染原始图形。
    2. **Middle**: 透明 Text Layer 用于选择和搜索。
    3. **Top**: Annotation Layer 用于交互和 Agent 标记。
- **智能缓存**: 缓存已解析的页面数据和已识别的表格结构，提升二次访问速度。

---

## 7. 典型 Agent 交互场景

### 7.1 场景一：财务报表分析
**Agent 目标**: 提取 PDF 财报中的利润表。
**内核调用**:
```typescript
const kernel = new PDFKernel();
await kernel.load(url);
const tables = await kernel.extractTables(5); // 提取第 5 页表格
// 内核自动识别表格行列，返回结构化 JSON
```

### 7.2 场景二：法律合同审核
**Agent 目标**: 发现合同中的不合规条款并标记。
**内核调用**:
```typescript
const matches = await kernel.findOccurrences("竞业协议");
for (const match of matches) {
  await kernel.addHighlight(match.rect, "建议修改：补偿金比例偏低");
}
```

---

## 8. 实施路线图

1. **Phase 1 (基础)**: 建立核心 Store，集成 PDF.js 实现基础加载与文本提取。
2. **Phase 2 (渲染)**: 实现 Canvas 渲染器和透明文本层，支持 Web 端基础预览。
3. **Phase 3 (提取引擎)**: 重点开发表格识别和目录提取算法。
4. **Phase 4 (Agent 接口)**: 封装语义化 API，支持坐标到语义的映射。
5. **Phase 5 (增强)**: 支持表单填充、批注持久化及导出功能。
