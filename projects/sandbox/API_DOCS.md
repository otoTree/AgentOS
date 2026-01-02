# Python Sandbox Service API v0.1.0

- 最后更新时间：2025-12-26
- 简要描述：基于 Express + Zod 的沙箱服务，提供 Python 代码执行、Python 包管理，以及基于 Playwright 的浏览器会话远程控制能力。所有接口默认需要 Bearer Token 认证。

---

## 1. 基础信息

### 1.1 基础 URL
- 本地默认：`http://localhost:8080`
- 端口来源：环境变量 `PORT`，未设置时默认 `8080`

### 1.2 认证方式
- Bearer Token（固定 Token 校验）
- Header：`Authorization: Bearer <TOKEN>`
- Token 来源：环境变量 `AUTH_TOKEN`，未设置时默认 `dev`

### 1.3 存储与缓存
服务提供执行产出物的临时存储功能，可以通过 `executionId` 下载执行过程中产生的文件。
- 存储路径：环境变量 `STORAGE_BUCKET_DIR`，默认 `/tmp/agentos-sandbox-bucket`
- 清理机制：
  - 清理间隔：`STORAGE_CLEANUP_INTERVAL_MS`，默认 10 分钟
  - 保留时长：`STORAGE_RETENTION_MS`，默认 1 小时

### 1.4 请求头要求
| Header | 是否必填 | 示例 | 说明 |
|---|---:|---|---|
| Authorization | 是 | `Bearer dev` | 所有接口都需要（包括 `/health`） |
| Content-Type | 视情况 | `application/json` | JSON 请求体接口必填 |

- JSON 请求体大小限制：`256kb`

### 1.4 响应格式
- 默认：`application/json`
- 特例：`GET /browser/sessions/:id/content` 返回 `text/html`

### 1.5 错误码规范（统一约定）
服务各路由返回的错误结构不完全一致，但通常遵循以下形态：

- 认证相关：
  - `401`：`{ "error": "Missing Bearer token" }`
  - `403`：`{ "error": "Invalid token" }`
  - `500`：`{ "error": "AUTH_TOKEN not configured" }`（极少见：当配置为空）

- 参数校验失败（常见）：
  - `400`：`{ "error": "Invalid request", "details": { ... } }`（Zod 格式化错误）
  - 或 `400`：`{ "error": "<message>" }`（部分浏览器接口）

- 业务/运行时失败：
  - `500`：`{ "error": "<message>" }`
  - 或 `500`：`{ "error": "<summary>", "message": "<detail>" }`

---

## 2. 接口一览

| 模块 | 方法 | 路径 | 说明 |
|---|---|---|---|
| System | GET | `/health` | 健康检查 |
| Execution | POST | `/execute` | 执行 Python 代码（返回 executionId） |
| Execution | GET | `/executions/:executionId/files/:filename` | 下载代码执行产生的文件 |
| Config | GET | `/config` | 获取当前沙箱配置（network/filesystem） |
| Config | POST | `/config/allowed-domains` | 更新沙箱网络允许域名（会重置沙箱） |
| Python | GET | `/python/packages` | 列出 venv 中已安装包 |
| Python | POST | `/python/packages` | 安装/卸载 Python 包 |
| Deployment | GET | `/deploy` | 列出所有部署 |
| Deployment | GET | `/deploy/:sandboxId` | 获取部署详情 |
| Deployment | DELETE | `/deploy/:sandboxId` | 删除部署 |
| Deployment | ANY | `/services/:sandboxId` | 调用已部署的服务（返回 executionId） |
| Deployment | GET | `/invokes/:executionId/files/:filename` | 下载服务调用产生的文件 |
| Browser | POST | `/browser/sessions` | 创建浏览器会话 |
| Browser | DELETE | `/browser/sessions/:id` | 销毁浏览器会话 |
| Browser | GET | `/browser/sessions/:id/state` | 获取会话状态（fingerprint/storageState） |
| Browser | POST | `/browser/sessions/:id/navigate` | 页面跳转并返回截图 |
| Browser | POST | `/browser/sessions/:id/action` | 执行页面交互并返回截图 |
| Browser | GET | `/browser/sessions/:id/content` | 获取页面 HTML（text/html） |
| Browser | GET | `/browser/sessions/:id/tabs` | 获取 Tab 列表 |
| Browser | POST | `/browser/sessions/:id/tabs` | 新建 Tab |
| Browser | DELETE | `/browser/sessions/:id/tabs/:tabId` | 关闭 Tab |

---

## 3. 接口详细说明

### 3.1 Health Check

#### 接口名称与功能描述
- 名称：Health Check
- 描述：返回服务存活信息。

#### 请求方法
- `GET`

#### 请求路径
- `/health`

#### 请求参数
- 无

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/health'
```

#### 响应字段说明（成功）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| ok | boolean | 是 | 固定为 true |

#### 响应示例
成功（200）：
```json
{ "ok": true }
```

失败（401）：
```json
{ "error": "Missing Bearer token" }
```

#### 注意事项和特殊说明
- 本接口同样需要 `Authorization`。

---

### 3.2 执行 Python 代码

#### 接口名称与功能描述
- 名称：Execute Python
- 描述：在（尽可能）受限沙箱环境中执行 Python 代码，返回 stdout/stderr/退出码，并可选上传执行目录内生成的文件。

#### 请求方法
- `POST`

#### 请求路径
- `/execute`

#### 请求参数
**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| code | string | 是 | Python 代码文本（非空） |
| timeoutMs | integer | 否 | 超时毫秒，范围 `1..120000`；超时会 SIGKILL |
| fileUploadUrl | string(url) | 否 | 文件上传服务 URL（配合 uploadToken 才会执行上传） |
| uploadToken | string | 否 | 上传服务 Bearer Token |
| public | boolean | 否 | 上传时会作为 query 参数 `public=true/false` 附加到 `fileUploadUrl` |

**兼容字段（仍放在 JSON 中，非标准但支持）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| file_upload_url | string | 否 | 等价于 `fileUploadUrl` |
| api_token | string | 否 | 等价于 `uploadToken` |
| public | boolean/string | 否 | 支持 `"true"` 字符串 |

#### 请求示例（cURL）
最小执行：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/execute' \
  -d '{
    "code": "print(\"Hello Sandbox\")"
  }'
```

带超时与上传：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/execute' \
  -d '{
    "code": "open(\"out.txt\",\"w\").write(\"hi\")\nprint(\"done\")",
    "timeoutMs": 5000,
    "fileUploadUrl": "https://files.example.com/upload",
    "uploadToken": "UPLOAD_TOKEN",
    "public": true
  }'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| executionId | string | 是 | 此次执行的唯一 ID，用于后续下载生成的文件 |
| exitCode | number/null | 是 | 子进程退出码（可能为 null） |
| signal | string/null | 是 | 终止信号（例如 `"SIGKILL"`），可能为 null |
| stdout | string | 是 | 标准输出 |
| stderr | string | 是 | 标准错误（会附带沙箱失败注释/标注） |
| uploads | array | 是 | 上传结果列表（未配置上传也会返回空数组） |

`uploads[]` 元素：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| filename | string | 是 | 相对执行目录的文件名；上传流程异常时可能为空字符串 |
| url | string | 否 | 上传服务返回的 URL（若能从 JSON 中解析到） |
| status | number | 是 | 上传服务 HTTP 状态码；上传流程异常时可能为 0 |
| error | string | 否 | 上传流程异常信息 |

#### 响应示例
成功（200）：
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "exitCode": 0,
  "signal": null,
  "stdout": "Hello Sandbox\n",
  "stderr": "",
  "uploads": []
}
```

失败：参数错误（400）：
```json
{
  "error": "Invalid request",
  "details": {
    "code": { "_errors": ["code is required"] }
  }
}
```

失败：执行失败（500）：
```json
{
  "error": "Execution failed",
  "message": "some error message"
}
```

#### 注意事项和特殊说明
- Python 解释器来自：`process.env.PYTHON_VENV` 或默认 `python-venv/bin/python`（相对项目根目录）。
- 每次执行会创建独立临时工作目录（系统 tmp 下），执行完成后会清理。
- 当环境不支持强沙箱时，服务可能降级为“未沙箱执行”，并在 `stderr` 追加类似：
  - `[Note] Sandbox disabled due to environment limitations: ...`
- 上传逻辑会遍历执行目录下的所有文件并逐个上传；需要同时提供 `fileUploadUrl` 与 `uploadToken` 才会执行上传。

---

### 3.3 获取沙箱配置

#### 接口名称与功能描述
- 名称：Get Sandbox Config
- 描述：返回当前内存中的沙箱配置（network/filesystem）。

#### 请求方法
- `GET`

#### 请求路径
- `/config`

#### 请求参数
- 无

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/config'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| network | object | 是 | 网络限制配置 |
| filesystem | object | 是 | 文件系统限制配置 |

`network` 常见字段（示例）：
| 字段 | 类型 | 说明 |
|---|---|---|
| allowedDomains | string[] | 允许访问的域名白名单 |
| deniedDomains | string[] | 拒绝访问的域名黑名单 |
| allowLocalBinding | boolean | 是否允许绑定本地端口 |
| allowUnixSockets | string[] | 允许访问的 Unix Socket 列表 |

`filesystem` 常见字段（示例）：
| 字段 | 类型 | 说明 |
|---|---|---|
| denyRead | string[] | 禁止读取路径列表 |
| allowWrite | string[] | 允许写入路径列表 |
| denyWrite | string[] | 禁止写入路径列表 |

#### 响应示例
成功（200）：
```json
{
  "network": {
    "allowedDomains": ["pypi.tuna.tsinghua.edu.cn"],
    "deniedDomains": [],
    "allowLocalBinding": false,
    "allowUnixSockets": []
  },
  "filesystem": {
    "denyRead": ["/etc/passwd", "~/.ssh", "~/.env"],
    "allowWrite": [".", "/tmp"],
    "denyWrite": ["src/", "package.json", ".env"]
  }
}
```

#### 注意事项和特殊说明
- 返回的是当前运行进程内的配置快照；修改允许域名请使用下一接口。

---

### 3.4 更新允许访问域名（Allowlist）

#### 接口名称与功能描述
- 名称：Update Allowed Domains
- 描述：更新沙箱网络允许域名列表，并重置/重新初始化沙箱以使配置生效。

#### 请求方法
- `POST`

#### 请求路径
- `/config/allowed-domains`

#### 请求参数
**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| domains | string[] | 是 | 允许域名列表（可为空数组） |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/config/allowed-domains' \
  -d '{
    "domains": ["example.com", "*.github.com", "pypi.tuna.tsinghua.edu.cn"]
  }'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| message | string | 是 | 成功提示 |
| allowedDomains | string[] | 是 | 更新后的 allowlist |

#### 响应示例
成功（200）：
```json
{
  "message": "Sandbox allowed domains updated successfully",
  "allowedDomains": ["example.com", "*.github.com", "pypi.tuna.tsinghua.edu.cn"]
}
```

失败：参数错误（400）：
```json
{
  "error": "Invalid request",
  "details": {
    "domains": { "_errors": ["Expected array, received string"] }
  }
}
```

失败：服务错误（500）：
```json
{
  "error": "Failed to update sandbox configuration",
  "message": "some error message"
}
```

#### 注意事项和特殊说明
- 此操作会 `reset` 并 `initialize` 沙箱，可能短暂影响并发执行任务的网络代理状态。
- domain 匹配行为以沙箱运行时实现为准；建议使用精确域名或通配符域名（如 `*.github.com`）。

---

### 3.5 列出 Python 包

#### 接口名称与功能描述
- 名称：List Python Packages
- 描述：在服务使用的 Python venv 内执行 `pip list --format=json` 并返回包列表。

#### 请求方法
- `GET`

#### 请求路径
- `/python/packages`

#### 请求参数
- 无

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/python/packages'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| packages | array | 是 | pip 返回的包数组 |

`packages[]` 常见字段（pip 输出）：
| 字段 | 类型 | 说明 |
|---|---|---|
| name | string | 包名 |
| version | string | 版本号 |

#### 响应示例
成功（200）：
```json
{
  "packages": [
    { "name": "pip", "version": "24.0" },
    { "name": "setuptools", "version": "70.0.0" }
  ]
}
```

失败（500）：
```json
{
  "error": "Failed to list packages",
  "details": "pip error output..."
}
```

#### 注意事项和特殊说明
- 该接口会尝试确保沙箱已初始化；如果沙箱初始化失败可能返回 500。
- Python 解释器位置同 `/execute`。

---

### 3.6 安装/卸载 Python 包

#### 接口名称与功能描述
- 名称：Manage Python Packages
- 描述：在 venv 内执行 `pip install/uninstall`。

#### 请求方法
- `POST`

#### 请求路径
- `/python/packages`

#### 请求参数
**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| action | string | 是 | `"install"` 或 `"uninstall"` |
| packages | string[] | 是 | 包名列表（至少 1 个） |

#### 请求示例（cURL）
安装：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/python/packages' \
  -d '{
    "action": "install",
    "packages": ["requests==2.32.3"]
  }'
```

卸载：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/python/packages' \
  -d '{
    "action": "uninstall",
    "packages": ["requests"]
  }'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| message | string | 是 | 成功提示文本 |
| output | string | 是 | pip stdout 输出 |

#### 响应示例
成功（200）：
```json
{
  "message": "Successfully installed packages: requests==2.32.3",
  "output": "Looking in indexes: https://pypi.tuna.tsinghua.edu.cn/simple\n..."
}
```

失败：参数错误（400）：
```json
{
  "error": "Invalid request",
  "details": {
    "packages": { "_errors": ["Array must contain at least 1 element(s)"] }
  }
}
```

失败：执行失败（500）：
```json
{
  "error": "Failed to install packages",
  "details": "pip error output..."
}
```

#### 注意事项和特殊说明
- `install` 会强制使用清华镜像：`-i https://pypi.tuna.tsinghua.edu.cn/simple`
- `uninstall` 会加 `-y` 自动确认。
- 网络访问受 allowlist 影响；若 allowlist 未包含对应域名，安装会失败。

---

### 3.7 管理部署 (Manage Deployments)

#### 3.7.1 列出所有部署

- **方法**: `GET`
- **路径**: `/deploy`
- **说明**: 列出当前内存中活跃的所有部署项目。

**响应示例**
```json
{
  "deployments": [
    {
      "sandboxId": "...",
      "entry": "main.py",
      "metaUrl": "...",
      "namespace": "default",
      "workDir": "/tmp/..."
    }
  ]
}
```

#### 3.7.2 获取部署详情

- **方法**: `GET`
- **路径**: `/deploy/:sandboxId`

**响应示例**
```json
{
  "sandboxId": "...",
  "entry": "main.py",
  "metaUrl": "...",
  "namespace": "default",
  "workDir": "/tmp/..."
}
```

#### 3.7.3 删除部署

- **方法**: `DELETE`
- **路径**: `/deploy/:sandboxId`
- **说明**: 删除部署记录并清理对应的工作目录。

**响应示例**
```json
{
  "status": "success",
  "message": "Deployment deleted"
}
```

---

### 3.8 调用部署服务 (Deployment Invoke)

#### 接口名称与功能描述
- 名称：Invoke Deployment
- 描述：调用已部署的代码服务。执行产生的所有文件都会被自动采集到临时存储桶中。

#### 请求方法
- `ANY` (GET/POST/PUT/DELETE/etc.)

#### 请求路径
- `/services/:sandboxId`

#### 请求参数
- 路径参数 `sandboxId`: 部署服务的唯一 ID。
- 其他参数随原始请求透传。

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| executionId | string | 是 | 此次调用的唯一 ID，用于下载产出文件 |
| response | any | 是 | 部署代码返回的原始响应数据 |

---

### 3.8 下载执行产出文件 (Download Files)

#### 接口名称与功能描述
- 名称：Download Execution Files
- 描述：根据 `executionId` 下载执行或调用过程中产生的文件。

#### 请求方法
- `GET`

#### 请求路径
- 直接执行产出：`/executions/:executionId/files/:filename`
- 服务调用产出：`/invokes/:executionId/files/:filename`

#### 请求参数
- 路径参数 `executionId`: 此次执行的 UUID。
- 路径参数 `filename`: 要下载的文件名（支持子路径）。

#### 请求示例（cURL）
```bash
curl -H 'Authorization: Bearer dev' \
  'http://localhost:8080/executions/550e8400-e29b-41d4-a716-446655440000/files/output.pdf' \
  --output output.pdf
```

#### 响应格式
- 成功：文件流
- 失败（404）：`{ "error": "File not found" }`

---

### 3.10 创建浏览器会话

#### 接口名称与功能描述
- 名称：Create Browser Session
- 描述：创建 Playwright Chromium 会话，并返回 `sessionId`。

#### 请求方法
- `POST`

#### 请求路径
- `/browser/sessions`

#### 请求参数
**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| fingerprint | any | 否 | 自定义指纹对象（可选） |
| storageState | any | 否 | Playwright storageState（可选，用于复用登录态等） |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/browser/sessions' \
  -d '{}'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| sessionId | string | 是 | 会话 ID（UUID 字符串） |

#### 响应示例
成功（200）：
```json
{ "sessionId": "7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a" }
```

失败（400）：
```json
{ "error": "Max sessions limit reached" }
```

#### 注意事项和特殊说明
- 会话数量限制：`MAX_BROWSER_SESSIONS`（默认 10）。
- 会话会按超时清理：`BROWSER_SESSION_TIMEOUT`（默认 10 分钟）。
- 浏览器网络走内部代理，并受 allowlist/denylist 影响。

---

### 3.8 销毁浏览器会话

#### 接口名称与功能描述
- 名称：Destroy Browser Session
- 描述：关闭会话对应的 BrowserContext 并移除会话。

#### 请求方法
- `DELETE`

#### 请求路径
- `/browser/sessions/:id`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

#### 请求示例（cURL）
```bash
curl -sS \
  -X DELETE \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| success | boolean | 是 | 固定 true |

#### 响应示例
```json
{ "success": true }
```

#### 注意事项和特殊说明
- 即使 session 不存在，通常也会返回 `{success:true}`（实现为“若存在则关闭”）。

---

### 3.9 获取会话状态（fingerprint + storageState）

#### 请求方法
- `GET`

#### 请求路径
- `/browser/sessions/:id/state`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/state'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| fingerprint | any | 是 | 会话指纹对象 |
| storageState | any | 是 | Playwright storageState |

#### 响应示例
```json
{
  "fingerprint": { "fingerprint": { "navigator": { "userAgent": "...", "language": "en-US" } } },
  "storageState": { "cookies": [], "origins": [] }
}
```

失败（400）：
```json
{ "error": "Session not found" }
```

---

### 3.10 页面跳转（Navigate）

#### 请求方法
- `POST`

#### 请求路径
- `/browser/sessions/:id/navigate`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| url | string(url) | 是 | 目标 URL |
| waitUntil | string | 否 | `load/domcontentloaded/networkidle/commit` |
| tabId | string | 否 | 指定操作 Tab；不传则用当前 active Tab |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/navigate' \
  -d '{
    "url": "https://example.com",
    "waitUntil": "domcontentloaded"
  }'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| url | string | 是 | 最终页面 URL（可能发生跳转） |
| screenshot | string | 是 | PNG 截图的 Base64 字符串 |
| tabId | string | 是 | 实际操作的 tabId |

#### 响应示例
```json
{
  "url": "https://example.com/",
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
  "tabId": "0d6f8f6b-7f2e-4c7c-8f6f-1d2c3b4a5e6f"
}
```

失败（400）：
```json
{ "error": "Session not found" }
```

#### 注意事项和特殊说明
- 返回截图为 Base64（无 data URL 前缀），使用时需自行拼接 `data:image/png;base64,`。
- URL 访问会受到 allowlist/denylist 影响。

---

### 3.11 页面动作（Action）

#### 接口名称与功能描述
- 名称：Perform Action
- 描述：对页面执行交互动作，并返回截图；部分动作可返回 `result`（如 evaluate）。

#### 请求方法
- `POST`

#### 请求路径
- `/browser/sessions/:id/action`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

**请求体（JSON）**
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| action | string | 是 | 见下方动作枚举 |
| selector | string | 否 | CSS 选择器 |
| x | number | 否 | 坐标/滚动参数 |
| y | number | 否 | 坐标/滚动参数 |
| endX | number | 否 | drag/move 目标坐标 |
| endY | number | 否 | drag/move 目标坐标 |
| value | string | 否 | fill/type/press/dragAndDrop 的输入 |
| script | string | 否 | evaluate 执行脚本 |
| tabId | string | 否 | 指定操作 Tab |
| duration | number | 否 | 动作延迟（ms） |
| steps | number | 否 | 鼠标移动步数 |

**action 枚举值**
- `click`, `fill`, `screenshot`, `evaluate`, `press`, `type`, `scroll`, `hover`, `drag`, `mouse_move`, `mouse_down`, `mouse_up`

**常见动作的必需条件（否则 400）**
| action | 必需字段（之一/组合） |
|---|---|
| click | `selector` 或 (`x` + `y`) |
| fill | `selector` + `value` |
| type | `value`（可选 `selector`） |
| evaluate | `script` |
| press | `value`（可选 `selector`） |
| hover | `selector` |
| drag | (`selector` + `value`) 或 (`x`+`y`+`endX`+`endY`) |
| mouse_move | `x` + `y` |

#### 请求示例（cURL）
点击按钮：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/action' \
  -d '{
    "action": "click",
    "selector": "#submit",
    "duration": 50
  }'
```

执行 evaluate：
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/action' \
  -d '{
    "action": "evaluate",
    "script": "() => ({ title: document.title, url: location.href })"
  }'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| result | any/null | 是 | evaluate 等动作的返回值，否则通常为 null |
| screenshot | string | 是 | PNG Base64 |
| url | string | 是 | 当前页面 URL |
| tabId | string | 是 | 实际操作的 tabId |

#### 响应示例
```json
{
  "result": { "title": "Example Domain", "url": "https://example.com/" },
  "screenshot": "iVBORw0KGgoAAAANSUhEUgAA...",
  "url": "https://example.com/",
  "tabId": "0d6f8f6b-7f2e-4c7c-8f6f-1d2c3b4a5e6f"
}
```

失败（400）：
```json
{ "error": "Selector and value required for fill" }
```

#### 注意事项和特殊说明
- 服务会在动作后尝试等待页面网络空闲（短超时），以提高截图稳定性。
- selector 等待存在 5s 超时（部分动作会尝试 waitForSelector）。

---

### 3.12 获取页面 HTML 内容（text/html）

#### 请求方法
- `GET`

#### 请求路径
- `/browser/sessions/:id/content`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| tabId | string | 否 | 指定 Tab；不传则使用 active Tab |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/content?tabId=0d6f8f6b-7f2e-4c7c-8f6f-1d2c3b4a5e6f'
```

#### 响应字段说明
- 成功时返回纯 HTML 文本（Content-Type: `text/html`），不是 JSON。

#### 响应示例
成功（200，HTML 片段）：
```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>...</body>
</html>
```

失败（400，JSON）：
```json
{ "error": "Session not found" }
```

#### 注意事项和特殊说明
- 客户端需要按 `text/html` 处理，不要用 JSON 解析。

---

### 3.13 获取 Tabs 列表

#### 请求方法
- `GET`

#### 请求路径
- `/browser/sessions/:id/tabs`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

#### 请求示例（cURL）
```bash
curl -sS \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/tabs'
```

#### 响应字段说明（成功 200）
返回数组，每项：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | tabId |
| url | string | 是 | 当前 URL |
| title | string | 是 | 页面标题（可能为空字符串） |
| active | boolean | 是 | 是否当前 active Tab |

#### 响应示例
```json
[
  {
    "id": "0d6f8f6b-7f2e-4c7c-8f6f-1d2c3b4a5e6f",
    "url": "https://example.com/",
    "title": "Example Domain",
    "active": true
  }
]
```

---

### 3.14 新建 Tab

#### 请求方法
- `POST`

#### 请求路径
- `/browser/sessions/:id/tabs`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |

#### 请求示例（cURL）
```bash
curl -sS \
  -X POST \
  -H 'Authorization: Bearer dev' \
  -H 'Content-Type: application/json' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/tabs' \
  -d '{}'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| tabId | string | 是 | 新建 tabId |

#### 响应示例
```json
{ "tabId": "4c9c2c25-1a2b-4f35-9d8b-0f1e2d3c4b5a" }
```

---

### 3.15 关闭 Tab

#### 请求方法
- `DELETE`

#### 请求路径
- `/browser/sessions/:id/tabs/:tabId`

#### 请求参数
**路径参数**
| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| id | string | 是 | sessionId |
| tabId | string | 是 | tabId |

#### 请求示例（cURL）
```bash
curl -sS \
  -X DELETE \
  -H 'Authorization: Bearer dev' \
  'http://localhost:8080/browser/sessions/7b8b2d7e-2d2c-4f1f-aafe-7c0d0d2c8f0a/tabs/4c9c2c25-1a2b-4f35-9d8b-0f1e2d3c4b5a'
```

#### 响应字段说明（成功 200）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| success | boolean | 是 | 固定 true |

#### 响应示例
```json
{ "success": true }
```

失败（400）：
```json
{ "error": "Tab not found" }
```

---

## 4. 附录

### 4.1 状态码对照表
| HTTP 状态码 | 含义 | 常见场景 |
|---:|---|---|
| 200 | OK | 请求成功 |
| 400 | Bad Request | 参数校验失败、Session/Tab 不存在、动作参数缺失 |
| 401 | Unauthorized | 未提供 Bearer Token |
| 403 | Forbidden | Bearer Token 不匹配 |
| 500 | Internal Server Error | 沙箱初始化/执行异常、pip 执行失败等 |

### 4.2 术语解释
| 术语 | 解释 |
|---|---|
| Sandbox（沙箱） | 通过运行时限制网络/文件系统等能力，降低执行代码风险 |
| allowlist（允许列表） | 允许访问的域名集合；不在列表内的网络请求会被拦截 |
| sessionId | 浏览器会话 ID（服务端维护的 BrowserContext） |
| tabId | 浏览器会话内的页面/Tab 标识 |
| storageState | Playwright 的存储状态（cookies、localStorage 等） |
| screenshot(Base64) | PNG 二进制截图做 Base64 编码后的字符串 |

### 4.3 常见问题解答（FAQ）
1) 为什么请求一直返回 401/403？
- 需要在所有请求里带：`Authorization: Bearer <AUTH_TOKEN>`；默认 token 为 `dev`。

2) `/health` 也要鉴权吗？
- 要。鉴权中间件作用于所有路由。

3) `GET /browser/sessions/:id/content` 为什么 JSON 解析报错？
- 该接口成功时返回 `text/html`，不是 JSON。

4) `pip install` 失败/超时怎么办？
- 检查 allowlist 是否允许访问 `pypi.tuna.tsinghua.edu.cn`；可通过 `/config` 查看或用 `/config/allowed-domains` 更新。

5) `/execute` 里为什么 `stderr` 有 “Sandbox disabled…”？
- 表示运行环境不支持强沙箱（例如缺少内核能力/平台限制），服务可能降级为未沙箱执行并在 stderr 给出提示。

6) 上传生成文件为什么没有发生？
- 必须同时提供 `fileUploadUrl` 与 `uploadToken`；否则 `uploads` 会是空数组。