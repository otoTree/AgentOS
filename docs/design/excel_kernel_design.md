# AgentOS 云端 Excel 表格微内核 (Excel-Kernel) 设计文档

## 1. 概述

本文档旨在设计一个高性能、可扩展且面向 AI Agent 优化的云端 Excel 表格微内核。该内核将被封装在 `@agentos/office` 包的 Excel 模块中，作为 AgentOS 平台处理结构化数据、表格计算和数据分析的核心基础设施。

### 1.1 设计目标
- **微内核架构**: 核心负责状态管理、坐标索引和计算引擎，功能（如格式化、图表、导出）通过插件扩展。
- **Agent 优先**: 提供强大的坐标系统（A1, R1C1）、区域操作接口和结构化数据提取能力，方便 LLM 进行精确的数据读写和逻辑分析。
- **高性能渲染**: 支持百万级行数据的流畅渲染，内置虚拟化滚动支持。
- **计算引擎**: 内置公式解析与计算引擎，支持 Excel 标准公式，并预留 AI 驱动的自定义函数接口。
- **协作就绪**: 原生支持协同编辑模型，适配多人实时操作场景。

---

## 2. 架构设计

采用微内核架构，将数据存储、逻辑计算与界面渲染彻底解耦。

### 2.1 核心组件 (Core)
- **Kernel (内核)**: 管理工作簿（Workbook）生命周期、插件注册中心。
- **Grid Store (格点存储)**: 基于稀疏矩阵（Sparse Matrix）的数据结构，优化海量空白单元格的存储。
- **Coord System (坐标系统)**: 提供 A1 <-> R1C1 <-> Index 的多维转换能力。
- **Calculation Engine (计算引擎)**: 处理单元格依赖追踪（Dependency Tracking）和公式计算。

### 2.2 插件系统 (Plugins)
- **Excel Parser/Exporter**: 负责 `.xlsx` / `.csv` 的双向转换。
- **Renderer Adapter**: 提供不同端的渲染实现（如 Canvas 渲染、React DOM 渲染、纯文本预览）。
- **Agent Skill Plugin**: 封装面向 Agent 的高级分析能力（如：自动生成透视表建议、数据清洗工具）。

---

## 3. 目录结构

```text
packages/office/
├── src/
│   ├── excel/          # Excel 内核模块
│   │   ├── core/       # 微内核核心 (Grid, State, Calc Engine)
│   │   ├── model/      # 数据结构定义 (Workbook, Sheet, Cell, Style)
│   │   ├── engine/     # 公式解析与计算逻辑
│   │   ├── plugins/    # 官方标准插件 (Excel, Renderer, Agent)
│   │   └── index.ts    # Excel 模块导出
│   ├── shared/         # 办公组件共享工具 (坐标转换、数学工具)
│   └── index.ts        # 总包导出
```

---

## 4. 数据模型 (Spreadsheet Schema)

为了兼顾性能和 Agent 的理解，数据模型分为 **核心数据层** 和 **元数据层**。

### 4.1 核心结构
```typescript
type WorkbookState = {
  id: string;
  sheets: SheetData[];
  activeSheetId: string;
};

type SheetData = {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  cells: Map<string, CellValue>; // Key 为 "r,c" 坐标字符串
  mergedCells: Range[];
  styles: Record<string, Style>;
};

type CellValue = {
  v: string | number | boolean | null; // 原始值
  f?: string;                          // 公式
  t?: 's' | 'n' | 'b' | 'e' | 'd';     // 类型 (String, Number, Boolean, Error, Date)
  s?: string;                          // 样式 ID
};
```

### 4.2 坐标与区域 (Range)
Agent 交互的核心是区域操作，定义标准的 `Range` 接口：
```typescript
type Range = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  sheetId?: string;
};
```

---

## 5. 渲染系统

- **技术选型**:
    - **渲染引擎**: 采用 [Konva.js](https://konvajs.org/) 作为核心渲染库。Konva 提供了高性能的 2D Canvas 渲染能力，支持图层管理、事件处理和丰富的形状绘制，非常适合构建复杂的表格界面。
- **双层渲染模式**:
    - **Canvas 渲染 (主模式)**: 基于 Konva.js 实现。利用 Konva 的 `Layer` 和 `Group` 机制管理网格、单元格内容和选区。通过 Konva 的高性能绘制能力保证大数据量下的 60fps 滚动体验。
    - **DOM 渲染**: 针对小规模数据或移动端，提供更好的辅助功能支持。
- **虚拟化**: 只渲染视口内（Viewport）的单元格，支持动态行高和列宽。
- **Agent 视图**: 提供 `toCSV()` 或 `toMarkdownTable()`，将指定区域转换为 Agent 易读的格式。

---

## 6. 面向 Agent 的底层能力 (Agent API)

### 6.1 原子操作接口 (Agent Tools)
Agent 通过以下工具与内核交互：
- `readRange(range: string)`: 例如 `readRange("A1:C10")`，返回结构化 JSON。
- `updateCells(updates: {coord: string, value: any, formula?: string}[])`: 批量更新单元格。
- `insertDimension(type: 'row' | 'col', index: number, count: number)`: 插入行或列。
- `setFormat(range: string, style: Partial<Style>)`: 设置区域格式（如背景色、数字格式）。

### 6.2 数据分析与增强
- **Semantic Header**: 自动识别表头，允许 Agent 通过列名操作数据，如 `getColumnData("销售额")`。
- **Formula Assistant**: Agent 可以查询某个公式的计算过程和引用链。
- **Data To JSON**: 将表格区域一键转换为 Agent 友好的 JSON 对象数组。
- **Auto-Fill Logic**: Agent 给出规则，内核执行高性能的填充。

---

## 7. 面向 Agent 的典型场景与接口示例

### 7.1 场景一：数据清洗与格式化
**Agent 目标**: 将第一列的日期格式统一为 `YYYY-MM-DD`。

**内核接口调用**:
```typescript
// 1. 获取数据
const data = await kernel.readRange("A2:A100"); 

// 2. Agent 逻辑处理后回写
await kernel.updateCells(data.map((val, idx) => ({
  coord: `A${idx + 2}`,
  value: formatDate(val),
  s: "date_style_id"
})));
```

### 7.2 场景二：智能公式填充
**Agent 目标**: 在 D 列计算 B 列（单价）和 C 列（数量）的乘积。

**内核接口调用**:
```typescript
await kernel.updateCells([
  { coord: "D2", formula: "=B2*C2" }
]);
// 触发自动填充
await kernel.autoFill("D2", "D2:D100");
```

### 7.3 场景三：多维数据摘要
**Agent 目标**: 对表格数据进行汇总，生成一个 Markdown 摘要。

**内核接口调用**:
```typescript
// 获取指定区域的结构化 JSON
const jsonTable = await kernel.toStructuredJSON("A1:E50", { hasHeader: true });

// Agent 接收到的数据格式：
// [
//   { "产品": "iPhone", "销量": 100, "单价": 5000 },
//   ...
// ]
```

---

## 8. Excel 解析策略

- **导入**: 采用 `exceljs` 或 `SheetJS` 核心逻辑，解析 OpenXML 结构，提取值、公式、样式和合并单元格。
- **导出**: 保证格式兼容性，支持导出为带有公式和样式的标准 `.xlsx` 文件。
- **流式处理**: 对于超大文件，支持流式解析，避免内存溢出。

---

## 8. 协作与持久化

- **CRDT 集成**: 核心状态可接入 `Yjs` 或 `Automerge`，实现单元格级别的冲突解决。
- **操作审计**: 记录每一笔 Agent 或人工的修改，支持按步骤回滚。

---

## 9. 实施路线图

1. **Phase 1 (基础)**: 定义微内核核心、坐标系统和基本的数据读写 API。
2. **Phase 2 (引擎)**: 集成公式计算引擎，支持基础 Excel 函数。
3. **Phase 3 (解析)**: 实现 XLSX 导入导出插件。
4. **Phase 4 (Agent 增强)**: 封装面向 Agent 的 JSON 转换工具和列语义识别。
5. **Phase 5 (渲染)**: 开发基于 Canvas 的高性能 Web 渲染器。
