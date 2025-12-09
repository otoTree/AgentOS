# Python Sandbox Service API 文档

本文档描述了 Python Sandbox Service 提供的 HTTP 接口。该服务允许用户在安全的沙箱环境中执行 Python 代码。

## 基础信息

- **默认端口**: `8080` (可通过环境变量 `PORT` 修改)
- **Base URL**: `http://localhost:8080` (本地默认)
- **认证方式**: Bearer Token
  - 所有请求（包括健康检查）都必须包含 HTTP 头部: `Authorization: Bearer <AUTH_TOKEN>`
  - `<AUTH_TOKEN>` 必须匹配服务启动时设置的环境变量 `AUTH_TOKEN`。

---

## 接口列表

### 1. 执行代码

提交 Python 代码并在沙箱环境中同步运行，等待并返回执行结果。

- **URL**: `/execute`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### 请求参数 (Body)

| 字段名 | 类型 | 必填 | 描述 | 限制 |
| :--- | :--- | :--- | :--- | :--- |
| `code` | string | 是 | 需要执行的 Python 源代码 | 非空字符串 |
| `timeoutMs` | number | 否 | 执行超时时间（毫秒） | 整数，范围 1 - 120000 (即 1ms 到 2分钟) |

#### 请求示例

```bash
curl -X POST http://localhost:8080/execute \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(1 + 1)",
    "timeoutMs": 1000
  }'
```

#### 成功响应 (200 OK)

```json
{
  "exitCode": 0,
  "stdout": "2\n",
  "stderr": "",
  "signal": null
}
```

#### 响应字段说明

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `exitCode` | number \| null | 进程退出状态码。`0` 表示正常成功退出，非 `0` 表示错误。如果进程被信号终止，可能为 `null`。 |
| `stdout` | string | 程序的标准输出内容。 |
| `stderr` | string | 程序的标准错误内容。如果发生沙箱违规（如尝试访问受限文件），系统可能会在此追加警告信息。 |
| `signal` | string \| null | 如果进程被信号强行终止（例如超时被杀），此字段显示信号名称（如 `"SIGKILL"`）。正常结束为 `null`。 |

#### 错误响应

- **400 Bad Request**: 请求体格式错误或参数校验失败（例如 `code` 字段缺失）。
  ```json
  {
    "error": "Invalid request",
    "details": { ... }
  }
  ```
- **401 Unauthorized**: 未提供认证 Token 或格式错误。
- **403 Forbidden**: 提供的 Token 无效。
- **500 Internal Server Error**: 服务内部错误或沙箱环境初始化失败。

---

### 2. 健康检查

检查服务是否正常运行。

- **URL**: `/health`
- **Method**: `GET`

#### 请求示例

```bash
curl http://localhost:8080/health \
  -H "Authorization: Bearer your-secret-token"
```

> **注意**: 根据当前服务配置，健康检查接口同样受鉴权保护。

#### 成功响应 (200 OK)

```json
{
  "ok": true
}