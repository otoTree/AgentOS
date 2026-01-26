# AI Service Specification

## 1. 概述 (Overview)

本规范文档定义了 AgentOS 核心 AI 服务 (`packages/service/core/ai`) 的扩展架构。目标是构建一个统一、可扩展的 AI 基础设施，不仅支持标准的 LLM（文本生成），还将能力扩展至向量模型（Embedding）、语音识别（ASR）、视觉语言模型（VLM）、光学字符识别（OCR）以及语义重排序（Rerank）。

此外，为了应对多样化的外部 AI 服务提供商和非标准 API，本规范引入了**异构请求映射层 (Heterogeneous Request Mapping Layer)**，允许通过声明式的字典/JSON 映射配置，将外部异构请求转换为平台内部的统一格式。

## 2. 核心架构 (Core Architecture)

AI 服务层主要由以下组件构成：

1.  **Unified Model Service**: 提供统一的 CRUD 和调用接口 (`chat`, `embed`, `transcribe`, `ocr`, `rerank`)。
2.  **Provider Adapters**: 针对特定厂商（OpenAI, Anthropic, Google 等）的底层实现。
3.  **Request/Response Mapper**: 处理异构 API 的输入输出转换。
4.  **Database Layer**: 存储 Provider 配置、Model 元数据及映射规则。

## 3. 模型接口定义 (Model Interfaces)

所有模型调用均通过 `ModelService` 暴露，底层根据 `model.type` 或 `model.capabilities` 路由到具体实现。

### 3.1 文本向量化 (Vector Embeddings)

支持文本到向量的转换，用于 RAG、语义搜索等场景。

*   **Capabilities**: `["embedding"]`
*   **Interface**:
    ```typescript
    async function getEmbeddings(
      modelId: string, 
      input: string | string[],
      options?: {
        dimensions?: number; // For OpenAI text-embedding-3 (e.g. 1024, 3072)
        instruction?: string; // For BGE/E5 query instruction (e.g. "Represent this sentence for searching relevant passages: ")
      }
    ): Promise<number[][]>
    ```
*   **Standard Output**: 二维浮点数组 `number[][]`。

### 3.2 自动语音识别 (ASR - Automatic Speech Recognition)

支持音频文件或流转换为文本，并支持多模态元数据提取（情感、事件、说话人）。

*   **Capabilities**: `["asr", "speech-to-text"]`
*   **Interface**:
    ```typescript
    interface ASRResponse {
      text: string;
      segments?: {
        start: number;
        end: number;
        text: string;
        speaker?: string; // Speaker ID for diarization
        emotion?: string[]; // e.g. ["happy", "neutral"]
        events?: string[];  // e.g. ["applause", "laughter"]
      }[];
      language?: string;
    }

    async function transcribe(
      modelId: string, 
      audioData: Blob | Buffer, 
      options?: {
        language?: string; // e.g., "en", "zh"
        prompt?: string;   // Optional context/prompt
        responseFormat?: 'json' | 'text' | 'srt' | 'vtt';
        diarization?: boolean; // Enable speaker diarization
      }
    ): Promise<ASRResponse>
    ```

### 3.3 视觉语言模型 (VLM - Vision Language Model)

支持图文、视频混合输入的对话模型。复用现有的 `chatComplete` 接口，但在 `messages` 中扩展多模态内容支持（遵循 OpenAI Vision API 标准）。

*   **Capabilities**: `["vlm", "vision"]`
*   **Interface**: `chatComplete` (Existing)
*   **Payload Extension**:
    ```typescript
    // Message Content Structure
    type ContentPart = 
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
      | { type: 'video_url'; video_url: { url: string } }; // For Video RAG

    // Example Input
    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: "What's in this video?" },
          { type: "video_url", video_url: { url: "https://example.com/video.mp4" } }
        ]
      }
    ];
    ```

### 3.4 光学字符识别 (OCR - Optical Character Recognition)

虽然 VLM 具备 OCR 能力，但专用 OCR 模型（如 PaddleOCR, Tesseract, Document Intelligence）通常提供更精确的**坐标布局 (Layout)** 和**结构化数据**。

*   **Capabilities**: `["ocr"]`
*   **Interface**:
    ```typescript
    interface OCRBlock {
      text: string;
      confidence: number;
      box: number[][]; // [x1, y1, x2, y2] or polygon points
      type?: 'text' | 'table' | 'formula';
    }

    interface OCRResponse {
      text: string; // Full concatenated text
      blocks: OCRBlock[];
      fullRawResponse?: any; // Provider specific response
    }

    async function ocr(
      modelId: string, 
      imageData: Blob | Buffer | string, // Buffer or URL
      options?: {
        mode?: 'fast' | 'accurate';
      }
    ): Promise<OCRResponse>
    ```

### 3.5 语义重排序 (Rerank)

用于 RAG 检索后的候选集重排序，通常使用 Cross-Encoder 模型。

*   **Capabilities**: `["rerank"]`
*   **Interface**:
    ```typescript
    interface RerankResult {
      index: number;
      relevance_score: number;
      document?: string;
    }

    async function rerank(
      modelId: string, 
      query: string,
      documents: string[] | Record<string, any>[], // List of text or objects
      options?: {
        top_k?: number;
        return_documents?: boolean; // Whether to return document content
      }
    ): Promise<RerankResult[]>
    ```

## 4. 异构请求映射 (Heterogeneous Request Mapping)

为了支持“通过字典映射的形式将一些数据转为这个平台”，我们在 Provider/Model 的配置 (`config`) 中引入 `mapping` 字段。这允许管理员在不修改代码的情况下接入非标准 API。

### 4.1 配置结构 (Schema)

在数据库的 `ai_providers` 或 `ai_models` 表的 `config` 字段中，增加 `apiMapping` 对象：

```typescript
interface ApiMappingConfig {
  // 请求体映射：将内部标准格式转换为外部 API 所需格式
  request: {
    // 字段重命名 (Simple Key-Value)
    fieldMap?: Record<string, string>;
    
    // 结构变换 (Advanced)
    // 支持简单的模板语法或 JSONPath
    transform?: Record<string, any>;
    
    // 固定参数注入
    staticParams?: Record<string, any>;
  };
  
  // 响应体映射：将外部 API 响应转换为内部标准格式
  response: {
    // 提取内容的位置 (JSONPath 风格)
    contentPath?: string; // e.g. "data.choices[0].text"
    usagePath?: string;   // e.g. "meta.billing.tokens"
  };
}
```

### 4.2 映射示例 (Examples)

#### 场景 A: 简单的字段重命名 (Simple Field Renaming)
假设外部 API 期望 `prompt` 而不是 `messages`，且模型参数名为 `model_version`。

```json
{
  "request": {
    "fieldMap": {
      "model": "model_version"
    },
    "transform": {
      "prompt": "{{messages.last.content}}" // 取最后一条消息作为 prompt
    }
  }
}
```

#### 场景 B: 复杂的结构转换 (Complex Transformation)
假设外部 API 是一个传统的 NLP 服务，接受 `{ "inputs": ["text"], "parameters": { ... } }`。

```json
{
  "request": {
    "staticParams": {
      "parameters": {
        "do_sample": true,
        "temperature": 0.7
      }
    },
    "transform": {
      "inputs": ["{{messages.last.content}}"] // 包装在数组中
    }
  },
  "response": {
    "contentPath": "0.generated_text" // 响应是数组 [{ "generated_text": "..." }]
  }
}
```

### 4.3 实现策略

1.  **Built-in Mappers**: 针对主流非标协议（如 HuggingFace Inference API, Vertex AI, Bedrock）提供内置的转换函数。
2.  **Configurable Mapper**: 对于简单的差异，使用上述 JSON 配置进行运行时转换。
3.  **JavaScript/Expression Evaluation**: (高级功能) 允许在配置中使用受限的表达式（如 `lodash` 模板）进行动态求值。

## 5. 数据库变更建议

无需修改表结构，利用现有的 `config` JSON 字段。建议在 `config` 中规范化以下结构：

```json
// ai_providers table -> config column
{
  "baseUrl": "...",
  "apiKey": "...",
  "apiMapping": { ... } // New field for mapping rules
}
```

## 6. 开发计划

1.  **Refactor `ModelService`**: 提取 `fetchWithRetry` 和基础逻辑，使其更易于扩展。
2.  **Implement New Interfaces**: 在 `ModelService` 中增加 `transcribe`, `ocr`, `rerank` 等方法，并定义对应的 Provider 适配逻辑。
3.  **Implement Mapping Layer**: 开发一个 `RequestMapper` 工具类，负责根据配置处理输入输出转换。
4.  **Integration**: 在 `ServiceLLMClient` 和其他上层服务中暴露新能力。

## 7. 代码组织与目录结构 (Code Organization & Directory Structure)

为了实现上述架构并保持代码的可维护性，建议在 `packages/service/core/ai` 下采用以下目录结构：

```bash
packages/service/core/ai/
├── index.ts                # 模块入口，导出 ModelService 单例和核心类型
├── types.ts                # 定义 ASRResponse, OCRResponse, RerankResult 等通用接口
├── service.ts              # ModelService 主逻辑 (CRUD, 路由分发)
├── client.ts               # ServiceLLMClient (适配 @agentos/agent 接口)
├── utils/                  # 工具函数
│   └── fetch.ts            # 统一的 fetchWithRetry (含重试、超时、拦截逻辑)
├── providers/              # 模型供应商适配器 (解耦具体厂商实现)
│   ├── index.ts            # ProviderFactory (根据 type 创建实例)
│   ├── base.ts             # AIProvider 抽象基类
│   ├── openai.ts           # OpenAI 协议兼容实现 (支持 DeepSeek, Moonshot 等)
│   ├── anthropic.ts        # Anthropic 实现
│   └── google.ts           # Google Gemini 实现
├── mapping/                # 异构请求映射层
│   ├── index.ts
│   └── engine.ts           # 映射引擎 (执行 JSON Config 中的 transform/jsonpath 逻辑)
└── rag/                    # RAG 多模态处理流水线 (Ingestion & Processing)
    ├── text/               # 文本/文档处理
    │   ├── loader.ts       # PDF/Office 解析
    │   └── splitter.ts     # 语义切片策略
    ├── image/              # 图片处理 (VLM + OCR Fusion)
    ├── audio/              # 音频处理 (Separation + ASR + Rich Text)
    └── video/              # 视频处理 (Audio-Driven Segmentation)
```

### 7.1 重构路线图 (Refactoring Roadmap)

1.  **Extract Providers**: 将 `service.ts` 中硬编码的 `if (type === 'openai')` 逻辑剥离到 `providers/openai.ts`，实现 `AIProvider` 接口。
2.  **Implement Mapping**: 创建 `mapping/engine.ts`，支持基于 JSONPath 的动态字段映射，并在 `providers/base.ts` 中集成。
3.  **Add RAG Processors**: 逐步实现 `rag/` 下的各模态处理器，供上层 Workflow 或 Knowledge Base 服务调用。
