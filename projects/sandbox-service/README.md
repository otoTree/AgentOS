# Python Sandbox Service

An Express + Zod TypeScript service that accepts Python code, executes it in a sandbox via `@anthropic-ai/sandbox-runtime`, and returns the result. Authentication uses a Bearer token in the `Authorization` header.

## Prerequisites

- Node.js `>= 18` and npm installed.
- `python3` available in `PATH`.
- macOS: no extra dependencies.
- Linux: install `bubblewrap` (`bwrap`) and `socat` for full sandboxing.
  - Debian/Ubuntu: `sudo apt-get install bubblewrap socat`
  - Fedora: `sudo dnf install bubblewrap socat`

## Setup

```
cd python-sandbox-service
npm install
npm run build
AUTH_TOKEN=your-secret-token npm start
```

- The server listens on `:8080` by default. Set `PORT=9000` to change.
- Set `AUTH_TOKEN` to any non-empty string. Requests must include `Authorization: Bearer <AUTH_TOKEN>`.

## API

- `POST /execute`
  - Body (JSON):
    - `code` (string, required): Python source to run
    - `timeoutMs` (number, optional): kill after N ms (1–120000)
    - `fileUploadUrl` (string, optional): file upload endpoint base
    - `uploadToken` (string, optional): Bearer token used for upload
    - `public` (boolean, optional): whether uploaded files are public
  - Response (JSON):
    - `exitCode` (number | null)
    - `stdout` (string)
    - `stderr` (string) — annotated with sandbox violation info when applicable
    - `uploads` (array) — upload results per file when configured

### Example

```
curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(2 + 2)",
    "fileUploadUrl": "https://files.example.com/upload",
    "uploadToken": "file-service-token",
    "public": true
  }' \
  http://localhost:8080/execute | jq
```

```
{
  "exitCode": 0,
  "stdout": "4\n",
  "stderr": "",
  "uploads": [
    { "filename": "chart.png", "url": "https://files.example.com/files/123", "status": 200 }
  ]
}
```

Add a timeout:

```
curl -sS -H "Authorization: Bearer your-secret-token" -H "Content-Type: application/json" \
  -d '{"code":"import time; time.sleep(3); print(\"done\")","timeoutMs":1000}' \
  http://localhost:8080/execute | jq
```

## Sandbox Configuration

In `src/index.ts`, `sandboxConfig` is secure-by-default:

- Network: all outbound requests denied (`allowedDomains: []`).
- Filesystem:
  - Deny reads of `~/.ssh`.
  - Allow writes to current directory (`.`) and `/tmp`.
  - Deny writes to `.env` and `secrets/`.

Adjust as needed, e.g. to allow GitHub:

```
network: {
  allowedDomains: ["github.com", "api.github.com"],
  deniedDomains: [],
  allowLocalBinding: false,
}
```

Notes:
- Linux glob support is limited; prefer explicit paths or `/**` suffix for directories.
- On Linux, ensure `bwrap` and `socat` are installed; otherwise sandboxing may be disabled.
- On macOS, violations appear in `stderr` via annotation and can be subscribed via the violation store.

## Health Check

```
curl http://localhost:8080/health
```

## Browser Sandbox API

示例基于 Bearer 认证（`Authorization: Bearer your-secret-token`）。

```
# 1) 创建会话
SESSION_ID=$(curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"device":"desktop"}' \
  http://localhost:8080/browser/sessions | jq -r .sessionId)

# 2) 页面跳转
curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","waitUntil":"domcontentloaded"}' \
  http://localhost:8080/browser/sessions/$SESSION_ID/navigate | jq

# 3) 获取页面源码（text/html）
curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  "http://localhost:8080/browser/sessions/$SESSION_ID/content" > page.html

# 3.1) 指定标签页获取源码
curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  "http://localhost:8080/browser/sessions/$SESSION_ID/content?tabId=$TAB_ID" > tab.html

# 4) 标签页管理
curl -sS -H "Authorization: Bearer your-secret-token" \
  http://localhost:8080/browser/sessions/$SESSION_ID/tabs | jq

curl -sS -X POST -H "Authorization: Bearer your-secret-token" \
  http://localhost:8080/browser/sessions/$SESSION_ID/tabs | jq

curl -sS -X DELETE -H "Authorization: Bearer your-secret-token" \
  http://localhost:8080/browser/sessions/$SESSION_ID/tabs/$TAB_ID

# 5) 页面交互示例（点击）
curl -sS \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"action":"click","selector":"#submit"}' \
  http://localhost:8080/browser/sessions/$SESSION_ID/action | jq
```

## Extending

- Add more filesystem/network rules in `sandboxConfig`.
- Implement an ask-callback to prompt/decide unknown domains programmatically if you want interactive allowance.
- Return timings, resource usage limits, or capture stdin from the request body if needed.

## License

Proprietary — for internal use in this project.
