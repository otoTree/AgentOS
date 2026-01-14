# Cloud Agent Skills Specification

## 1. 概述

本规范旨在将 [Agent Skills](https://agentskills.io/specification) 的优秀设计理念融入 AgentOS 现有的架构中。
我们坚持 **“以我为主，兼容并蓄”** 的原则：
1.  **核心保持**：继续使用 AgentOS 现有的 `meta.json` 作为技能的权威配置（Source of Truth），因为它在结构化定义（Schema、Entrypoint）上已经非常完善。
2.  **语义增强**：引入 `SKILL.md` 作为补充，利用其自然语言优势增强 LLM 对技能的理解和使用能力。
3.  **集中运行**：采用 Serverless 架构，统一沙箱调度，拒绝“一技一端点”。

## 2. 融合架构 (Fused Architecture)

在 AgentOS 中，一个 Skill 是 **结构化配置 (meta.json)** 与 **自然语言文档 (SKILL.md)** 的结合。

### 2.1 目录结构 (OSS & Workbench)

```
skills/{skill_id}/v1/
├── meta.json             # [核心] 运行时配置 (AgentOS Native)
├── SKILL.md              # [增强] 技能说明书 (Agent Skills Spec)
├── src/                  # [代码] 源代码目录
│   ├── main.py           # [入口] 程序入口，引用其他脚本
│   └── utils.py

```

### 2.2 meta.json (执行层 - 不变)

继续沿用现有的 `meta.json` 设计，它是系统调度的唯一依据。

```json
{
  "id": "uuid",
  "name": "pdf-processing",
  "version": "1.0.0",
  "entry": "src/main.py",
  "description": "Extract text and tables from PDF files.",
  "input_schema": { ... },  // 严格校验
  "output_schema": { ... }
}
```

### 2.3 SKILL.md (语义层 - 新增)

我们引入 `SKILL.md` 主要用于 **Prompt Context Injection**。
当 Agent 思考如何使用工具时，`meta.json` 的 JSON Schema 虽然精确但缺乏语境，而 `SKILL.md` 提供了丰富的 Examples 和 Usage Guide。

**融合策略**：
*   **构建索引时**：系统会读取 `SKILL.md` 的 Frontmatter 和 Description 更新数据库。
*   **运行时 Prompt**：系统会将 `SKILL.md` 的核心段落注入到 System Prompt 中，帮助 LLM 更准确地生成参数。

## 3. 生命周期管理

### 3.1 导入与兼容 (Ingestion)

当用户导入一个外部的 Agent Skill (仅有 `SKILL.md`) 时，系统会自动生成 `meta.json`：

1.  **读取** `SKILL.md` 的 Frontmatter -> 填充 `meta.json` 的 `name`, `description`。
2.  **推导** `SKILL.md` 的 Examples -> 生成 `meta.json` 的 `input_schema`。
3.  **生成** 默认入口适配器，指向用户的脚本。

### 3.2 运行机制 (Serverless Execution)

采用 **集中式沙箱运行 (Centralized Sandbox Runner)** 架构。

1.  **调用**: SuperAgent 请求 `POST /api/skills/{id}/run`。
2.  **加载**: Skill Service 读取 `meta.json` 找到入口。
3.  **执行**: 将代码包动态加载到通用 Sandbox 池中运行。
4.  **适配**: 如果代码是 CLI 风格，通过 `meta.json` 指定的适配器将其转换为函数调用。

## 4. 总结

*   **meta.json** 依然是“大脑”，控制怎么跑。
*   **SKILL.md** 变成了“嘴巴”，告诉 AI 怎么用。
*   我们不需要推翻现有的设计，而是让 `SKILL.md` 成为 `meta.json` 的一个有力补充。