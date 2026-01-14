# AgentOS Skill Documentation Design Specification

## 1. 目标
设计一套 `SKILL.md` 编写与加载规范，旨在：
- **提升智能性**：通过结构化信息，使 Agent 更容易提取关键逻辑。
- **保证稳定性**：减少 Token 溢出风险，通过清晰的边界防止上下文污染。
- **支持渐进式加载**：允许 Agent 根据需求按需读取文档的特定部分（Chunks）。

## 2. SKILL.md 结构规范

文档采用 **Markdown + XML 增强** 的混合格式。

### 2.1 基础结构
文档分为三个层次：
1.  **Meta Layer (元数据)**: YAML Frontmatter，包含名称、版本、作者等。
2.  **Core Layer (核心层)**: Agent 启动时必须加载的信息（定义、核心接口）。
3.  **Extension Layer (扩展层)**: 按需加载的信息（示例、详细指南、边界情况），使用 XML `<chunk>` 标签包裹。

### 2.2 详细定义

#### Frontmatter
```yaml
---
name: skill_name
version: 1.0.0
description: A short summary of what this skill does.
created_at: 2023-10-27
author: User
---
```

#### Core Content
必须包含以下章节（Markdown 标题）：
- `# Title`
- `## Overview`: 简要描述。
- `## Interface`: 输入参数和输出结构的详细说明。

#### Chunk Content (Lazy Loading)
对于长文本、多示例或特定场景的指导，使用 XML 标签包裹：

```xml
<chunk id="examples" description="Few-shot examples for complex scenarios">
## Examples
...
</chunk>

<chunk id="troubleshooting" description="Common errors and fixes">
## Troubleshooting
...
</chunk>
```

## 3. 渐进式加载策略 (Progressive Loading Strategy)

加载器（Loader）应支持以下几种模式：

### 3.1 摘要模式 (Summary Mode) - 默认加载
加载器仅读取：
1. Frontmatter。
2. 所有非 `<chunk>` 包裹的 Markdown 内容（即 Core Content）。
3. `<chunk>` 标签的元数据（id 和 description），但不包含标签内的内容。

**Agent 上下文视角：**
```markdown
# Skill Name
## Overview
...
## Interface
...
[Available Chunks]
- examples: Few-shot examples for complex scenarios
- troubleshooting: Common errors and fixes
```

### 3.2 按需加载 (On-Demand Loading)
当 Agent 发现当前上下文不足以解决问题（例如需要参考具体示例），它可以发出指令（或调用工具）请求加载特定 Chunk。

**操作流程：**
1. Agent 阅读 Summary，发现需要更多信息。
2. Agent 调用 `load_doc_chunk(skill_name, chunk_id="examples")`。
3. 系统将 `<chunk id="examples">` 中的内容注入到当前上下文（或作为临时消息发送）。

### 3.3 自动分级加载 (Auto-Level Loading)
如果不使用显式 XML，也可以基于 Markdown 标题层级实现：
- **Level 1**: H1 + H2 标题列表。
- **Level 2**: 选定 H2 下的 H3 标题列表 + 正文前 200 字符。
- **Level 3**: 完整内容。

*建议优先采用 XML Chunk 方案，因为边界更清晰，更适合 LLM 准确控制。*

## 4. 编写示例

```markdown
---
name: data_analyzer
version: 1.0.1
description: Analyzes CSV data and generates charts.
---

# Data Analyzer Skill

## Overview
This skill takes a CSV file path and a query, analyzes the data using pandas, and produces a chart.

## Interface
- **Input**:
  - `filepath` (str): Path to the CSV file.
  - `query` (str): Analysis question.
- **Output**:
  - `summary` (str): Textual analysis.
  - `chart_path` (str): Path to the generated image.

<chunk id="examples" description="3 examples of different analysis types">
## Examples

### Example 1: Trend Analysis
Input: ...
Output: ...

### Example 2: Distribution
Input: ...
Output: ...
</chunk>

<chunk id="limitations" description="Known constraints and edge cases">
## Limitations
- Only supports UTF-8 encoded CSVs.
- Maximum file size: 100MB.
</chunk>
```

## 5. 对生成逻辑的影响
需要修改 `packages/agent/src/coder/prompts/index.ts` 中的 `SKILL_GEN_DOC_PROMPT`，指导 LLM 生成带有 XML Chunk 的 Markdown 文档。
