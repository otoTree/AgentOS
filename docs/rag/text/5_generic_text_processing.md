# 通用文本 (Markdown, Web, Code, Txt) 处理与 Meta-Content 构建策略

## 1. 概述 (Overview)

“通用文本”涵盖了除 PDF、Office、结构化数据之外的广泛格式，包括 Markdown 文档、网页内容 (HTML)、源代码以及纯文本文件。

尽管这些格式看似非结构化，但它们通常隐含着丰富的**层级信息**（如 Markdown 标题、URL 路径、代码目录结构）。本规范的核心策略是**挖掘隐式结构**，将其显式化为 Meta-Content，以增强检索的语境感知能力。

## 2. Markdown & HTML (Web) 处理

Markdown 和 HTML 本质上是结构化文本，处理逻辑与 Word 文档类似，核心在于提取**标题树 (Heading Tree)**。

### 2.1 处理策略

1.  **DOM/AST 解析**: 
    *   **Markdown**: 解析为 AST (Abstract Syntax Tree)，识别 `#` (H1) 到 `######` (H6)。
    *   **HTML**: 使用 `readability` 提取正文，并保留 `<h1>`~`<h6>` 结构；提取 `<title>` 和 `<meta name="keywords">`。
2.  **路径继承**: 每个文本块必须携带从根节点到当前节点的完整标题路径。

### 2.2 Meta-Content 构建

**示例 Input (Markdown)**:
```markdown
# AgentOS 开发指南
## 插件系统
### 安装插件
使用 `pnpm add` 命令安装...
```

**Meta-Content**:
```xml
<meta>
Source: developer_guide.md
Title: AgentOS 开发指南
Path: 插件系统 > 安装插件
Type: Documentation
</meta>
<content>
使用 `pnpm add` 命令安装...
</content>
```

**示例 Input (Web Page)**:
*   URL: `https://agentos.com/blog/rag-optimization`
*   Title: RAG 性能优化指南

**Meta-Content**:
```xml
<meta>
Source: https://agentos.com/blog/rag-optimization
Title: RAG 性能优化指南
Keywords: RAG, Vector Search, Optimization
</meta>
<content>
(网页正文片段...)
</content>
```

## 3. 代码文件 (Source Code) 处理

代码文件的**目录结构**和**符号定义** (Class/Function) 是最重要的上下文。

### 3.1 处理策略

1.  **Language Aware Splitter**: 使用支持特定语言（Python, TS, Go 等）的 Splitter，避免将函数体截断。
2.  **符号提取**: 解析代码，识别当前 Chunk 属于哪个 Class 或 Function。
3.  **文件路径**: 文件路径往往包含模块、层级信息 (e.g., `src/auth/login.ts`)。

### 3.2 Meta-Content 构建

**示例 Input (TypeScript)**:
```typescript
// src/services/auth.ts
class AuthService {
  async login(user: User) {
    // login logic...
  }
}
```

**Meta-Content**:
```xml
<meta>
File: src/services/auth.ts
Language: TypeScript
Context: Class AuthService > Method login
Summary: Handles user authentication and login logic.
</meta>
<content>
async login(user: User) {
  // login logic...
}
</content>
```
*(注：如果可能，让 LLM 生成一句代码功能的简短 Summary 放入 Meta 中效果极佳)*

## 4. 纯文本 (Plain Text / Txt) 处理

纯文本（如日志文件、无格式笔记）最难处理，因为缺乏显式标记。

### 4.1 策略 A: 规则分割与文件名增强

*   **文件名**: 往往是唯一的元数据来源，必须保留。
*   **分割**: 按空行或固定字符数分割。

**Meta-Content**:
```xml
<meta>
Filename: meeting_notes_20231024.txt
Type: Note
</meta>
<content>
讨论了 Q4 的营销计划...
</content>
```

### 4.2 策略 B: LLM 语义增强 (Semantic Enrichment)

对于重要的纯文本，建议使用 LLM 进行预处理。

1.  **自动摘要**: 对全文生成摘要。
2.  **主题提取**: 提取当前 Chunk 的 Key Topics。

**Meta-Content**:
```xml
<meta>
Filename: interview_transcript.txt
Global Summary: 这是一个关于高级后端工程师职位的面试记录。
Topics: System Design, Database Scaling
</meta>
<content>
候选人详细描述了如何处理高并发下的缓存一致性问题...
</content>
```

## 5. 最佳实践总结

1.  **Don't treat Text as String**: 永远不要把文本仅看作字符串。即使是 `.txt`，也有文件名；即使是代码片段，也有文件路径。
2.  **显式化隐式结构**: Markdown 的 Header、代码的缩进/括号、URL 的路径，都是隐式的结构，务必在 Meta-Content 中显式化。
3.  **URL 是重要的 Meta**: 对于 Web 内容，URL 本身包含丰富信息（域名=来源，Path=分类），必须完整保留在 `<meta>` 中。
