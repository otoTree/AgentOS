# Server API 文档

基础地址：`http://localhost:3001/api/v1`

认证方式：使用 NextAuth 的会话 Cookie（`next-auth.app-session-token`）。需要登录后取到该 Cookie，再在请求中带上。

通用 Header：

```
Content-Type: application/json
Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN
```

## Health

### GET /health

curl 示例：

```bash
curl http://localhost:3001/api/v1/health
```

## AI

### POST /ai/chat/completions

请求体：

```
{
  "model": "model-id-or-name",
  "messages": [{ "role": "user", "content": "你好" }],
  "temperature": 0.7,
  "max_tokens": 256
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/ai/chat/completions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "model": "model-id-or-name",
    "messages": [{ "role": "user", "content": "你好" }],
    "temperature": 0.7,
    "max_tokens": 256
  }'
```

### POST /ai/embeddings

请求体：

```
{
  "model": "model-id-or-name",
  "input": "文本或文本数组"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/ai/embeddings \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "model": "model-id-or-name",
    "input": "你好"
  }'
```

## Skills Registry

### GET /skills

查询参数：

- `teamId`：可选，不传则返回全局公开技能

curl 示例：

```bash
curl "http://localhost:3001/api/v1/skills?teamId=TEAM_ID" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### GET /skills/:id

curl 示例：

```bash
curl http://localhost:3001/api/v1/skills/SKILL_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /skills/:id/run

请求体：

```
{
  "input": {
    "key": "value"
  }
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/skills/SKILL_ID/run \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "input": { "key": "value" }
  }'
```

## Dataset

### POST /dataset/upload

说明：上传文件或更新已有文件。使用 multipart/form-data，文件字段名为 `file`。

表单字段：

- `teamId`：可选
- `folderId`：可选
- `fileId`：可选（更新文件时使用）

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/dataset/upload \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "teamId=TEAM_ID" \
  -F "folderId=FOLDER_ID"
```

### GET /dataset

查询参数：

- `source`：必填，`personal` 或 `team`
- `teamId`：当 `source=team` 时必填
- `parentId`：可选

curl 示例：

```bash
curl "http://localhost:3001/api/v1/dataset?source=personal" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /dataset/folder

请求体：

```
{
  "name": "文件夹名称",
  "parentId": "PARENT_ID",
  "teamId": "TEAM_ID"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/dataset/folder \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "我的文件夹",
    "parentId": "PARENT_ID",
    "teamId": "TEAM_ID"
  }'
```

### DELETE /dataset/folder/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/dataset/folder/FOLDER_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### DELETE /dataset/file/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/dataset/file/FILE_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

## Workbench

### POST /workbench/skills

请求体：

```
{
  "teamId": "TEAM_ID",
  "name": "技能名称",
  "description": "描述",
  "emoji": "🧠",
  "isPublic": false
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/workbench/skills \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "teamId": "TEAM_ID",
    "name": "技能名称",
    "description": "描述",
    "emoji": "🧠",
    "isPublic": false
  }'
```

### PATCH /workbench/skills/:id

请求体（任意字段可选）：

```
{
  "name": "新名称",
  "description": "新描述",
  "emoji": "⚡️",
  "isPublic": true
}
```

curl 示例：

```bash
curl -X PATCH http://localhost:3001/api/v1/workbench/skills/SKILL_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "name": "新名称",
    "description": "新描述",
    "emoji": "⚡️",
    "isPublic": true
  }'
```

### DELETE /workbench/skills/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/workbench/skills/SKILL_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### GET /workbench/skills/:id/files

查询参数：

- `filename`：必填
- `raw`：可选，`true` 表示直接返回二进制

curl 示例：

```bash
curl "http://localhost:3001/api/v1/workbench/skills/SKILL_ID/files?filename=main.py" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### PUT /workbench/skills/:id/files

请求体：

```
{
  "files": {
    "main.py": "print(123)"
  },
  "metaUpdates": {}
}
```

curl 示例：

```bash
curl -X PUT http://localhost:3001/api/v1/workbench/skills/SKILL_ID/files \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "files": { "main.py": "print(123)" },
    "metaUpdates": {}
  }'
```

### DELETE /workbench/skills/:id/files

查询参数：

- `filename`：必填

curl 示例：

```bash
curl -X DELETE "http://localhost:3001/api/v1/workbench/skills/SKILL_ID/files?filename=main.py" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /workbench/skills/:id/deploy

请求体：

```
{
  "type": "private"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/workbench/skills/SKILL_ID/deploy \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "type": "private"
  }'
```

## Admin

### GET /admin/models/providers

curl 示例：

```bash
curl http://localhost:3001/api/v1/admin/models/providers \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /admin/models/providers

请求体：由模型供应商配置决定

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/admin/models/providers \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{ "name": "provider-name", "config": {} }'
```

### DELETE /admin/models/providers/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/models/providers/PROVIDER_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### GET /admin/models/providers/:id/test

curl 示例：

```bash
curl http://localhost:3001/api/v1/admin/models/providers/PROVIDER_ID/test \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /admin/models/providers/:providerId/models

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/admin/models/providers/PROVIDER_ID/models \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{ "name": "model-name", "config": {} }'
```

### PATCH /admin/models/models/:id

curl 示例：

```bash
curl -X PATCH http://localhost:3001/api/v1/admin/models/models/MODEL_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{ "name": "model-name", "config": {} }'
```

### DELETE /admin/models/models/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/admin/models/models/MODEL_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

## Chat

### GET /chat/sessions

curl 示例：

```bash
curl http://localhost:3001/api/v1/chat/sessions \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /chat/sessions

请求体：

```
{
  "title": "会话标题"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{ "title": "会话标题" }'
```

### DELETE /chat/sessions/:id

curl 示例：

```bash
curl -X DELETE http://localhost:3001/api/v1/chat/sessions/SESSION_ID \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### GET /chat/sessions/:id/messages

curl 示例：

```bash
curl http://localhost:3001/api/v1/chat/sessions/SESSION_ID/messages \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN"
```

### POST /chat/message

请求体：

```
{
  "sessionId": "SESSION_ID",
  "message": "你好",
  "model": "MODEL_ID"
}
```

curl 示例：

```bash
curl -X POST http://localhost:3001/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.app-session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "sessionId": "SESSION_ID",
    "message": "你好",
    "model": "MODEL_ID"
  }'
```
