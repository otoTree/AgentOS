# AgentOS Excel Component Roadmap

本文档记录了 AgentOS Excel 组件的开发路线图，旨在将当前的 MVP 版本演进为功能完备、具备 AgentOS 特色的专业表格组件。

## 现状分析 (Current Status)

### ✅ 已实现 (Implemented)
- **基础渲染**: 基于 Konva 的 Canvas 渲染 (网格、表头、文本)。
- **虚拟滚动**: `ScrollManager` 支持大数据量下的流畅滚动。
- **基础交互**: 单元格选择 (`InteractionManager`) 和双击编辑。

### ❌ 缺失核心功能 (Missing Core Features)
- **样式**: 渲染器硬编码了字体和颜色，忽略了数据模型中的 `style` 字段。
- **UI**: 缺少工具栏 (Toolbar) 和右键菜单 (Context Menu)。
- **结构操作**: 无法调整行列宽高，无法增删行列。
- **数据能力**: 不支持公式，不支持剪贴板操作。

---

## 📅 开发路线图 (Development Roadmap)

### 🚀 Phase 1: 核心体验与样式 (Core Experience & Styling)
**目标**：解决“只能看不能修”的问题，让表格具备基础的格式化能力。

1.  **样式渲染引擎 (Style Rendering Engine)**
    -   ✅ **任务**: 修改 `KonvaRenderer`，使其不再硬编码样式，而是读取 `Cell.style` 数据。
    -   ✅ **细节**: 支持 字体 (Font Family/Size)、加粗/斜体 (Bold/Italic)、文字颜色 (Color)、背景色 (Background)、水平/垂直对齐 (Align)。
2.  **UI 工具栏 (Toolbar Integration)**
    -   ✅ **任务**: 在 `excel-editor.tsx` 中集成 Shadcn UI 组件。
    -   ✅ **细节**: 创建顶部工具栏，包含常用格式按钮。实现 `Selection -> Style Update` 的数据流。
3.  **行列交互 (Row/Col Interaction)**
    -   ✅ **任务**: 增强表头交互能力。
    -   ✅ **细节**: 支持**拖拽调整列宽/行高** (Resize)；支持点击表头**选中整行/整列**。

### 🧩 Phase 2: 结构化编辑能力 (Structural Editing)
**目标**: 支持复杂的表格结构操作，提升编辑效率。

1.  **右键菜单系统 (Context Menu)**
    -   🔄 **任务**: 实现自定义右键菜单。
    -   **细节**: 提供 插入/删除行、插入/删除列、清除内容、删除单元格等操作。
2.  **合并单元格 (Merge Cells)**
    -   **任务**: 完善渲染与交互逻辑。
    -   **细节**: 渲染层支持跨行/跨列绘制；选择逻辑需处理合并单元格的边界（即选中合并单元格的一部分时，自动扩展选区）。
3.  **撤销/重做 (Undo/Redo)**
    -   **任务**: 引入命令模式 (Command Pattern)。
    -   **细节**: 维护一个 `HistoryStack`，捕获所有对 `SheetData` 的修改操作。

### 🔢 Phase 3: 数据与计算能力 (Data & Computation)
**目标**: 让表格具备“灵魂”，支持公式与数据流转。

1.  **剪贴板系统 (Clipboard System)**
    -   **任务**: 打通系统剪贴板。
    -   **细节**: 支持 `Ctrl+C` / `Ctrl+V`。处理 Excel 格式 (TSV/HTML) 的粘贴，实现与外部 Excel/Google Sheets 的数据互通。
2.  **公式引擎 (Formula Engine)**
    -   **任务**: 实现基础公式解析与依赖追踪。
    -   **细节**:
        -   **Parser**: 解析 `=SUM(A1:B2)` 等基础语法。
        -   **Dependency Graph**: 构建单元格依赖图，当 A1 变动时自动重算引用了 A1 的单元格。
        -   **函数库**: 实现基础数学函数 (SUM, AVG, MIN, MAX, COUNT)。

### 🤖 Phase 4: AgentOS 特色集成 (AI Integration)
**目标**: 利用 AgentOS 的 LLM 能力，打造差异化体验。

1.  **AI Copilot for Excel**
    -   **场景**:
        -   **"帮我算一下销售额"**: 自然语言自动生成公式。
        -   **"标红所有大于 100 的值"**: 自动应用条件格式。
        -   **"分析数据趋势"**: 选中区域，右键调用 Agent 生成分析报告。
