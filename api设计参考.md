# WebDeployment API 文档

## 1. 项目概述

**项目名称**: WebDeployment
**版本**: 1.0.0
**功能描述**: 
WebDeployment 是一个用于动态部署和热更新 Web 应用的服务。它允许用户通过提供元数据 URL 来部署应用，并支持在不完全重部署的情况下对运行中的应用进行增量补丁更新（添加、修改、删除文件）。该服务运行在沙箱环境中，确保隔离性和安全性。

**基础 URL**: `http://localhost:3000`
**运行环境要求**:
- [Bun](https://bun.sh/) 运行时
- Node.js (兼容)

## 2. API 端点详细说明

### 2.1 部署应用 (Deploy)

用于根据提供的元数据 URL 部署一个新的应用实例。

- **URL**: `/deploy`
- **方法**: `POST`
- **Content-Type**: `application/json`

#### 请求参数 (Body)

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `metaUrl` | string | 是 | 指向项目 `meta.json` 文件的 URL，定义了项目的入口和文件列表。 |
| `namespace` | string | 否 | 部署的命名空间，用于逻辑分组。 |
| `strategy` | string | 否 | 部署策略。可选值: `clean` (清理旧实例), `reuse` (复用现有实例)。默认为 `clean`。 |

#### 请求示例

```json
{
  "metaUrl": "https://example.com/project/meta.json",
  "namespace": "prod",
  "strategy": "clean"
}
```

#### 响应 (Success 200)

| 参数名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `status` | string | 请求状态，通常为 "success"。 |
| `endpoint` | string | 部署成功的应用访问 URL。 |
| `port` | number | 分配给该沙箱实例的端口号。 |
| `sandboxId` | string | 沙箱实例的唯一标识符。 |
| `message` | string | 描述信息。 |

#### 响应示例

```json
{
  "status": "success",
  "endpoint": "http://localhost:12345",
  "port": 12345,
  "sandboxId": "sandbox-uuid-1234",
  "message": "Project deployed successfully"
}
```

### 2.2 应用补丁 (Patch)

用于对已部署的沙箱实例进行增量更新（热更新）。

- **URL**: `/patch`
- **方法**: `POST`
- **Content-Type**: `application/json`

#### 请求参数 (Body)

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `sandboxId` | string | 是 | 目标沙箱实例的 ID。 |
| `changes` | array | 是 | 变更列表。见下表 `Change` 对象。 |
| `reload` | boolean | 否 | 是否在补丁应用后重启进程。默认为 `false`。 |

**Change 对象结构:**

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `type` | string | 是 | 变更类型: `add` (新增), `modify` (修改), `delete` (删除)。 |
| `path` | string | 是 | 相对于项目根目录的文件路径。 |
| `url` | string | 否 | 新文件的下载 URL (当 type 为 `add` 或 `modify` 时必填)。 |

#### 请求示例

```json
{
  "sandboxId": "sandbox-uuid-1234",
  "reload": true,
  "changes": [
    {
      "type": "modify",
      "path": "src/App.js",
      "url": "https://example.com/patches/v2/src/App.js"
    },
    {
      "type": "add",
      "path": "public/new-icon.png",
      "url": "https://example.com/patches/v2/public/new-icon.png"
    }
  ]
}
```

#### 响应 (Success 200)

| 参数名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `status` | string | 请求状态，通常为 "success"。 |
| `restarted` | boolean | 指示应用进程是否已重启。 |
| `message` | string | 操作结果摘要。 |

#### 响应示例

```json
{
  "status": "success",
  "restarted": true,
  "message": "Patched 2 file(s)"
}
```

### 2.3 健康检查 (Health Check)

用于检查服务是否正常运行。

- **URL**: `/health`
- **方法**: `GET`

#### 响应 (Success 200)

返回纯文本: `OK`

## 3. 认证和授权说明

API 启用了 **Bearer Token** 认证机制以保护接口安全。

- **认证方式**: Bearer Token
- **Header**: `Authorization: Bearer <your-token>`
- **配置**: Token 值通过服务器端的环境变量 `API_BEARER_TOKEN` 进行配置。

所有请求（除 `/health` 外）均需要携带有效的 Token，否则将收到 `401 Unauthorized` 错误。

## 4. 错误处理

API 使用标准的 HTTP 状态码来指示请求结果。错误响应统一采用 JSON 格式。

#### 错误响应格式

```json
{
  "status": "error",
  "message": "具体的错误描述信息"
}
```

#### 常见错误码

| 状态码 | 含义 | 说明 |
| :--- | :--- | :--- |
| `400` | Bad Request | 请求参数缺失或格式错误 (如缺少 `metaUrl` 或 `sandboxId`)。 |
| `401` | Unauthorized | 缺少 `Authorization` 头或 Token 无效。 |
| `404` | Not Found | 指定的 `sandboxId` 不存在。 |
| `500` | Internal Server Error | 服务器内部错误 (如部署失败、下载失败等)。 |

## 5. 使用示例

### 场景：部署并随后更新应用

1.  **部署新版本**

    ```bash
    curl -X POST http://localhost:3000/deploy \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer mysecrettoken" \
      -d '{
        "metaUrl": "https://raw.githubusercontent.com/user/repo/main/meta.json",
        "strategy": "clean"
      }'
    ```

    **响应**:
    ```json
    {
      "status": "success",
      "endpoint": "http://localhost:10245",
      "port": 10245,
      "sandboxId": "sb-8f7a9c",
      "message": "Project deployed successfully"
    }
    ```

2.  **热更新文件**

    假设我们需要修复 `index.js` 中的一个 bug，并添加一个新的配置文件 `config.json`。

    ```bash
    curl -X POST http://localhost:3000/patch \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer mysecrettoken" \
      -d '{
        "sandboxId": "sb-8f7a9c",
        "reload": true,
        "changes": [
          {
            "type": "modify",
            "path": "index.js",
            "url": "https://raw.githubusercontent.com/user/repo/fix-bug/index.js"
          },
          {
            "type": "add",
            "path": "config.json",
            "url": "https://raw.githubusercontent.com/user/repo/fix-bug/config.json"
          }
        ]
      }'
    ```

    **响应**:
    ```json
    {
      "status": "success",
      "restarted": true,
      "message": "Patched 2 file(s)"
    }
    ```