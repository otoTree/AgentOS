# Office 文档 (DOCX, PPTX) 处理与 Meta-Content 构建策略

## 1. 概述 (Overview)

Office 文档（主要指 .docx, .pptx）本质上是基于 XML 的压缩包（Office Open XML 格式）。与 PDF 不同，Office 文档通常保留了良好的逻辑结构（标题层级、段落、表格对象）。

利用这些内部结构，我们可以构建比 PDF 更加精确的 Meta-Content，特别是通过**样式 (Styles)** 和**对象树 (Object Tree)** 来还原文档的语义骨架。

## 2. DOCX 处理策略

DOCX 是 RAG 中最友好的非结构化格式之一。

### 2.1 结构提取 (Structure Extraction)

不要将 DOCX 视为纯文本流，而应视为一棵 DOM 树。

*   **标题 (Headings)**: 利用 `Heading 1` ~ `Heading 9` 样式构建文档树。
*   **段落 (Paragraphs)**: 每个段落都是树的一个叶子节点。
*   **表格 (Tables)**: Word 中的表格通常是结构化的，可以直接转换为 Markdown/HTML。

### 2.2 Meta-Content 构建

核心思想是**路径继承 (Path Inheritance)**。任何一个文本片段都应该携带其完整的标题路径。

#### 示例

**原始文档**:
> # 公司规章制度 (Heading 1)
> ## 考勤管理 (Heading 2)
> ### 迟到处理 (Heading 3)
> 员工迟到 30 分钟以内，扣除 50 元全勤奖。

**Chunking 与 Meta-Content**:

*   **Chunk**: `员工迟到 30 分钟以内，扣除 50 元全勤奖。`
*   **Meta-Content**:
    ```text
    Source: employee_handbook.docx
    Path: 公司规章制度 > 考勤管理 > 迟到处理
    Content: 员工迟到 30 分钟以内，扣除 50 元全勤奖。
    ```

**优化技巧**:
*   **列表合并**: 将连续的 List Item (`<li>`) 合并为一个 Chunk，防止语义断裂。
*   **批注提取**: 提取文档中的 Comment，作为独立的 Chunk 或附加信息，这对审阅类 RAG 很有用。

## 3. PPTX 处理策略

PPTX 是一种视觉导向的格式，文本稀疏且碎片化。

### 3.1 核心挑战

*   **信息密度低**: 一张 Slide 可能只有几个 bullet points。
*   **视觉依赖**: 很多信息隐含在排版、箭头、图表中。

### 3.2 Meta-Content 构建

PPTX 的处理单位应为 **Slide (幻灯片)**。

#### 策略 A: 文本聚合 (Text Aggregation)

将同一张 Slide 上的所有文本框内容合并，并加上 Slide Title。

*   **Meta-Content 格式**:
    ```text
    Filename: Q3_Report.pptx
    Slide: 5
    Title: 市场增长分析
    Content: 
    - 亚太区增长 15%
    - 北美区持平
    - 主要驱动力：新产品发布
    Speaker Notes: 本页重点强调亚太区的亮眼表现，主要得益于 Q3 发布的新品。
    ```
    *(注意：一定要提取 **Speaker Notes (演讲者备注)**，这里往往包含比正文更丰富的解释性信息)*

#### 策略 B: 视觉增强 (Visual Enrichment)

对于包含复杂图表（如流程图、架构图）的 Slide，将其导出为图片，通过 VLM 生成描述。

*   **Meta-Content 格式**:
    ```xml
    <meta>
    Type: Slide Image Description
    Title: 市场增长分析
    Description: 这是一个柱状图，显示了各季度的销售额。Q3 的柱子最高，标注为 15M...
    </meta>
    <content>
    亚太区增长 15%...
    </content>
    ```

## 4. 推荐工具

1.  **Python**:
    *   `python-docx`: 读取 DOCX 文本、表格和样式。
    *   `python-pptx`: 读取 PPTX 的 Slide、Shape、Text 和 Notes。
2.  **Unstructured**:
    *   提供了对 Office 文档的开箱即用支持，能自动处理 List 合并和 Title 识别。

## 5. 最佳实践总结

1.  **利用层级**: 始终将 `H1 > H2 > H3` 路径附加到 Chunk 中。
2.  **不忽略备注**: PPTX 的 Speaker Notes 是宝藏。
3.  **表格保留结构**: DOCX 表格转 Markdown 效果通常很好，不需要 OCR。
4.  **文件名即元数据**: 文件名往往包含重要信息（如年份、项目名），务必作为 Meta 放入。
