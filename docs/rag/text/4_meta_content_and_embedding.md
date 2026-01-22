# Meta-Content 与向量化核心策略

## 1. 核心理念：Index Content ≠ Display Content

传统的 RAG 往往直接对原始文本切片进行向量化。然而，**原始切片往往缺乏独立语义**。

本规范的核心原则是：**用于检索的内容 (Index Content / Meta-Content) 应该与用于生成的内容 (Display Content) 分离。**

*   **Display Content**: 原始文本，保持原汁原味，用于 LLM 生成最终答案。
*   **Meta-Content**: 经过清洗、增强、结构化、上下文补全的文本，用于计算 Vector，最大化检索命中率。

## 2. Meta-Content 通用构建模版

无论源文件格式如何（PDF, Word, CSV），高质量的 Meta-Content 通常遵循以下结构：

```text
[Global Context]
Filename: ...
Title: ...
Summary: (文档级摘要)

[Local Context]
Path: Section A > Subsection B
Page/Slide/Row: ...
Context: (上一段落摘要/父级描述)

[Semantic Payload]
Content: (原始文本/表格描述/图片Caption/行数据描述)
Keywords: (提取的关键实体)
Hypothetical Questions: (该片段能回答的问题)
```

### 2.1 示例对比

| 原始切片 (Bad) | Meta-Content (Good) |
| :--- | :--- |
| "它通常需要 15 分钟。" | `<meta>Document: Oven Manual; Section: Preheat</meta><content>Preheating the oven typically takes 15 minutes.</content>` |
| "N/A" | `<meta>File: Patient_Records; Field: Allergies</meta><content>No known allergies.</content>` |

## 3. 向量化策略 (Embedding Strategy)

构建好 Meta-Content 后，需要将其转换为向量。

### 3.1 模型选择

*   **OpenAI `text-embedding-3-small/large`**:
    *   **优点**: 维度可变，窗口大 (8k)，多语言支持好。
    *   **适用**: 通用场景，无需微调。
*   **BGE-M3 (BAAI)**:
    *   **优点**: 支持 Dense (向量), Sparse (关键词), ColBERT (多向量) 三种模式；支持超长文本。
    *   **适用**: 私有化部署，多语言混合场景。
*   **E5-Mistral**:
    *   **优点**: 基于 LLM 的 Embedding，理解能力极强。
    *   **适用**: 追求极致精度的场景。

### 3.2 Instruction (指令)

许多现代 Embedding 模型（如 E5, BGE）要求区分 Query 和 Document，或者添加任务指令。

*   **Query Side**: `Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ...`
*   **Document Side**: 通常不需要 Instruction，或者使用 `passage: ` 前缀。

**规范**: 在生成向量前，必须检查所选模型是否需要特定前缀或指令。

### 3.3 Token 截断与加权

*   **截断**: 虽然模型支持 8k 窗口，但**语义稀释**是真实存在的。建议 Meta-Content 控制在 512-1000 tokens 以内。
*   **加权**: 某些向量数据库支持 Weighted Embedding。如果不支持，可以通过**重复重要关键词**（如在 Meta-Content 中重复 Entity Name）来变相增加权重。

## 4. 存储与检索设计

```sql
-- 推荐的数据库 Schema 设计 (PostgreSQL/pgvector)
CREATE TABLE chunks (
    id UUID PRIMARY KEY,
    
    -- 1. 用于展示给用户和 LLM 的原始内容
    raw_content TEXT, 
    
    -- 2. 用于生成向量的 Meta-Content (调试用，可不存)
    meta_content TEXT,
    
    -- 3. 向量 (基于 meta_content 计算)
    embedding VECTOR(1536),
    
    -- 4. 结构化元数据 (用于 Filter)
    metadata JSONB -- { "source": "pdf", "page": 1, "year": 2024 }
);
```

## 5. 总结

索引的核心在于 **Meta-Content 的质量**。不要试图通过更换向量模型来修复由垃圾切片导致的问题。

**Golden Rule**: 在 Embedding 之前，人类阅读一下你的 Meta-Content。如果你不看上下文就不知道这段话在说什么，Embedding 模型也一样。
