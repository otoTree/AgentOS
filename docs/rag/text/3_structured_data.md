# 结构化数据 (CSV, Excel, JSON) 处理与 Meta-Content 构建策略

## 1. 概述 (Overview)

结构化数据（如 CSV, Excel, JSON 记录）通常用于存储高密度的事实信息。在 RAG 系统中，直接对原始数据行进行 Embedding 往往效果不佳，因为缺乏自然语言的语法结构，导致向量空间与用户自然语言 Query 不对齐。

本规范定义了将结构化数据转化为高质量 Meta-Content 的策略，核心是从 **Data Row** 到 **Semantic Text** 的映射。

## 2. 核心挑战

*   **缺乏语境**: `35, Male, 1` 对模型来说不如 `Age: 35, Gender: Male, Status: Active` 有意义。
*   **统计查询失效**: RAG 擅长语义检索，不擅长计算。问“平均年龄是多少”时，检索出所有行并不能解决问题。
    *   *注：本规范仅关注**语义检索**场景（如“查找所有负责 AI 项目的工程师”）。统计类需求应交给 Text-to-SQL 或 DataFrame Agent。*

## 3. 处理策略：Row-to-Text (行转文本)

假设我们有一行 CSV 数据：
`id: 101, name: John Doe, role: Senior Engineer, project: Project Alpha, status: Delayed`

### 3.1 策略 A: 键值对序列化 (KVP Serialization) - **通用推荐**

最简单且有效的方法，保留字段名。

*   **Meta-Content**:
    ```xml
    <meta>
    Type: Employee Record
    Name: John Doe
    Role: Senior Engineer
    Project: Project Alpha
    Status: Delayed
    </meta>
    <content>
    Name: John Doe
    Role: Senior Engineer
    Project: Project Alpha
    Status: Delayed
    </content>
    ```

### 3.2 策略 B: 模板化叙述 (Template-based Narrative) - **高质量**

如果数据 Schema 固定，设计一个自然语言模板效果最好。

*   **Template**: `{name} is a {role} working on {project}. The current status is {status}.`
*   **Meta-Content**:
    ```xml
    <meta>
    Type: Employee Record
    Name: John Doe
    Role: Senior Engineer
    Project: Project Alpha
    </meta>
    <content>
    John Doe is a Senior Engineer working on Project Alpha. The current status is Delayed.
    </content>
    ```
    *优点：生成的向量与自然语言 Query（如 "Who is working on Project Alpha?"）极其接近。*

### 3.3 策略 C: LLM 增强摘要 (LLM-Enriched Summary)

对于包含长文本字段（如 `comments`, `description`）的记录。

*   **Meta-Content**: 让 LLM 阅读整行数据，生成一段摘要。
    > "John Doe, a Senior Engineer, is currently facing delays in Project Alpha due to resource constraints (as mentioned in comments)."

## 4. Excel 特殊处理

Excel 不仅仅是 CSV，它包含多个 Sheet 和可能的层级表头。

1.  **Sheet 处理**: 每个 Sheet 视为一个独立的 Document 或 Group。
2.  **复杂表头 (Multi-level Headers)**:
    *   如果是合并单元格的表头，需要将父级表头“扁平化”到每一列。
    *   例如：`Q1 > Revenue` 和 `Q1 > Cost` 应处理为 `Q1 Revenue` 和 `Q1 Cost`。
3.  **Context Injection**:
    *   在每一行的 Meta-Content 中，加入文件名和 Sheet 名。
    *   Meta: `[File: Financial_Report_2024.xlsx] [Sheet: Q1_Data] Region: North, Revenue: 500K...`

## 5. JSON 处理

JSON 通常是嵌套的。

1.  **扁平化 (Flattening)**: 将嵌套 JSON 转换为扁平的 Key-Value 路径。
    *   `{"user": {"address": {"city": "New York"}}}` -> `user.address.city: New York`
2.  **列表展开 (List Expansion)**:
    *   如果 JSON 包含列表，通常意味着一对多关系。可以将其拆分为多个 Chunks，或者聚合为一个描述性 Chunk。

## 6. 示例：客户工单数据

**Input (CSV)**:
```csv
TicketID,Customer,Issue,Priority,Resolution
T-1001,Acme Corp,Login failed error 503,High,Restarted auth service
```

**Meta-Content Generation**:

*   **User Query 预期**: "How was the login issue for Acme Corp resolved?"
*   **Constructed Meta-Content**:
    ```xml
    <meta>
    Type: Ticket Information
    ID: T-1001
    Customer: Acme Corp
    Priority Level: High
    </meta>
    <content>
    Issue Description: Login failed error 503
    Resolution Notes: Restarted auth service
    Summary: Acme Corp encountered a high-priority login failure (error 503), which was resolved by restarting the auth service.
    </content>
    ```

## 7. 最佳实践总结

1.  **字段名扩展**: 不要使用缩写（如 `dob`），在 Meta-Content 中展开为全称（`Date of Birth`）。
2.  **过滤无用列**: 去除内部 ID、哈希值等对语义检索无用的列，减少噪音。
3.  **数值语义化**: 将 `status: 1` 转换为 `status: Active`（需要数据字典支持）。
4.  **混合检索**: 对结构化数据，强烈建议使用 **Hybrid Search** (Keyword + Vector)。关键词检索能精确命中 "Acme Corp"，向量检索能命中 "Login issue"。
