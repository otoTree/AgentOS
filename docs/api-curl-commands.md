# 项目主要 API 的 curl 命令合集

> 使用前先设置环境变量：

```bash
export BASE_URL=http://localhost:3000
export TOKEN=YOUR_API_TOKEN
export DEPLOYMENT_ID=YOUR_DEPLOYMENT_ID
export FILE_ID=YOUR_FILE_ID
export FOLDER_ID=YOUR_FOLDER_ID
export SHARE_TOKEN=YOUR_SHARE_TOKEN
export IMAGE_KEY=avatars/user-123.png
export AGENT_CONVERSATION_ID=YOUR_AGENT_CONVERSATION_ID
export SESSION_COOKIE="next-auth.session-token=YOUR_SESSION_JWT"
```

## 基础认证（NextAuth 会话）

```bash
# 用途：获取 CSRF Token（用于凭证登录）
# 预期：200 返回 { csrfToken: "..." }
curl -X GET "$BASE_URL/api/auth/csrf"

# 用途：凭证登录以获得会话 Cookie
# 预期：302/200，设置 Set-Cookie（next-auth.session-token 或 __Secure-next-auth.session-token）
# 注意：csrfToken 需替换为上一步获取的值
curl -X POST "$BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=CSRF_TOKEN_VALUE" \
  --data-urlencode "email=email@example.com" \
  --data-urlencode "password=your_password" \
  --data-urlencode "json=true" \
  -c cookies.txt

# 用途：使用 Cookie 访问需会话的接口（示例：Agent 会话）
# 预期：200 返回会话详情
curl -X GET "$BASE_URL/api/agent/$AGENT_CONVERSATION_ID" \
  -b cookies.txt
```

## Files 文件

```bash
# 用途：列出当前用户所有文件
# 预期：200 返回文件列表 JSON
curl -X GET "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN"

# 用途：按关键词搜索文件内容或名称
# 预期：200 返回匹配列表
curl -X GET "$BASE_URL/api/files?search=report" \
  -H "Authorization: Bearer $TOKEN"

# 用途：按文件夹过滤（根目录传空或不传）
# 预期：200 返回该文件夹内文件
curl -X GET "$BASE_URL/api/files?folderId=$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN"

# 错误场景：缺少鉴权头
# 预期：401 {"error":"Unauthorized"}
curl -X GET "$BASE_URL/api/files"
```

```bash
# 用途：上传文件至个人存储（默认私有）
# 预期：200 返回文件元数据 JSON
curl -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf"

# 用途：上传并生成公开分享链接
# 预期：200 返回 JSON（含 downloadUrl/shareUrl）
curl -X POST "$BASE_URL/api/files?public=true" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf"

# 用途：上传到指定文件夹
# 预期：200 返回文件 JSON（folderId 设定）
curl -X POST "$BASE_URL/api/files?folderId=$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf"

# 错误场景：未提供文件
# 预期：400 {"error":"No file provided"}
curl -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file="

# 错误场景：超出单文件 50MB 限制
# 预期：400 {"error":"File size limit is 50MB"}
curl -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/large_file"
```

```bash
# 用途：重命名文件
# 预期：200 返回更新后的文件 JSON
curl -X PATCH "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"new-name.pdf"}'

# 用途：移动文件到指定文件夹（移至根传 null）
# 预期：200 返回更新后的文件 JSON
curl -X PATCH "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folderId":"'"$FOLDER_ID"'"}'

# 错误场景：目标文件夹已有同名文件
# 预期：409 {"error":"A file with this name already exists in the destination"}
curl -X PATCH "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"conflict.pdf","folderId":"'"$FOLDER_ID"'"}'

# 错误场景：文件不存在或非拥有者
# 预期：404 {"error":"File not found"}
curl -X PATCH "$BASE_URL/api/files/UNKNOWN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"x.pdf"}'
```

```bash
# 用途：inline 浏览器预览下载文件
# 预期：200 二进制流，Content-Type 为文件 MIME
curl -X GET "$BASE_URL/api/files/$FILE_ID/download" \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded.bin

# 用途：以附件形式下载
# 预期：200 二进制流，附带 Content-Disposition: attachment
curl -X GET "$BASE_URL/api/files/$FILE_ID/download?download=true" \
  -H "Authorization: Bearer $TOKEN" \
  -o file.pdf

# 错误场景：无访问权限（非拥有者且未共享）
# 预期：403 {"error":"Unauthorized"}
curl -X GET "$BASE_URL/api/files/$FILE_ID/download" \
  -H "Authorization: Bearer INVALID_OR_OTHER_USER_TOKEN"
```

## Folders 文件夹

```bash
# 用途：列出指定父目录下的文件夹（根目录 parentId 为空或不传）
# 预期：200 返回文件夹数组
curl -X GET "$BASE_URL/api/folders?parentId=$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN"

# 用途：创建文件夹（支持在目标父目录下）
# 预期：200 返回新建文件夹 JSON
curl -X POST "$BASE_URL/api/folders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Reports","parentId":"'"$FOLDER_ID"'"}'

# 错误场景：同父目录下重名
# 预期：409 {"error":"A folder with this name already exists"}
curl -X POST "$BASE_URL/api/folders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Reports","parentId":"'"$FOLDER_ID"'"}'
```

```bash
# 用途：重命名文件夹或移动父目录
# 预期：200 返回更新后的文件夹 JSON
curl -X PATCH "$BASE_URL/api/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"2025","parentId":null}'

# 错误场景：目标父目录已有同名文件夹
# 预期：409 {"error":"A folder with this name already exists in the destination"}
curl -X PATCH "$BASE_URL/api/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Reports"}'

# 用途：删除文件夹（注意实际 S3 清理需另行处理）
# 预期：200 {"success":true}
curl -X DELETE "$BASE_URL/api/folders/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN"

# 错误场景：非拥有者或不存在
# 预期：404 {"error":"Folder not found"}
curl -X DELETE "$BASE_URL/api/folders/UNKNOWN_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## 分享下载与图片代理

```bash
# 用途：通过分享令牌公开下载文件（无需鉴权）
# 预期：200 二进制流
curl -X GET "$BASE_URL/api/share/$SHARE_TOKEN/download" -o shared.bin

# 错误场景：令牌不存在或非公开
# 预期：404 {"error":"File not found or invalid link"}
curl -X GET "$BASE_URL/api/share/INVALID_TOKEN/download"
```

```bash
# 用途：通过 S3 代理读取图片（公开）
# 预期：200 二进制图像，含缓存头
curl -X GET "$BASE_URL/api/images/$IMAGE_KEY" -o avatar.jpg

# 错误场景：不存在的 Key
# 预期：404 "Image not found" 或 "Not Found"
curl -X GET "$BASE_URL/api/images/non/existent.png"
```

## Run 部署运行

```bash
# 用途：GET 触发部署运行（无输入）
# 预期：200 返回执行结果 JSON；响应头含 X-Remaining-Credits
curl -X GET "$BASE_URL/api/run/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# 用途：POST 触发部署运行（带输入 JSON）
# 预期：200 返回处理后的结果 JSON；扣 1 积分
curl -X POST "$BASE_URL/api/run/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"hello","count":2}'

# 错误场景：缺少 Bearer Token
# 预期：401 {"error":"Unauthorized: Missing Bearer Token"}
curl -X GET "$BASE_URL/api/run/$DEPLOYMENT_ID"

# 错误场景：无效 Token
# 预期：401 {"error":"Unauthorized: Invalid Token"}
curl -X GET "$BASE_URL/api/run/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer INVALID"

# 错误场景：私有部署且非所有者访问
# 预期：403 {"error":"Forbidden: You do not have access to this private deployment"}
curl -X GET "$BASE_URL/api/run/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer TOKEN_OF_OTHER_USER"

# 错误场景：余额不足
# 预期：402 {"error":"Payment Required: Insufficient credits"}
# 注：需在系统中消耗完用户积分后再调用
curl -X GET "$BASE_URL/api/run/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# 错误场景：部署不存在或未激活
# 预期：404 或 410
curl -X GET "$BASE_URL/api/run/UNKNOWN_DEPLOYMENT" \
  -H "Authorization: Bearer $TOKEN"
```

## Agent 代理会话（会话 Cookie）

```bash
# 用途：获取指定会话的消息/工具/文件
# 预期：200 返回会话 JSON
curl -X GET "$BASE_URL/api/agent/$AGENT_CONVERSATION_ID" \
  -H "Cookie: $SESSION_COOKIE"

# 错误场景：未登录（缺 Cookie）
# 预期：401 "Unauthorized"
curl -X GET "$BASE_URL/api/agent/$AGENT_CONVERSATION_ID"
```

## Upload 图片上传（会话 Cookie）

```bash
# 用途：上传用户头像图片（只允许 image/*，<=5MB）
# 预期：200 返回 { url, filename }；url 指向 /api/images/*
curl -X POST "$BASE_URL/api/upload" \
  -H "Cookie: $SESSION_COOKIE" \
  -F "file=@/path/to/avatar.png" \
  -F "type=avatar"

# 用途：上传项目图片
# 预期：200 返回 { url, filename }
curl -X POST "$BASE_URL/api/upload" \
  -H "Cookie: $SESSION_COOKIE" \
  -F "file=@/path/to/cover.jpg" \
  -F "type=project"

# 错误场景：未登录
# 预期：401 {"error":"Unauthorized"}
curl -X POST "$BASE_URL/api/upload" \
  -F "file=@/path/to/avatar.png" \
  -F "type=avatar"

# 错误场景：非图片或过大
# 预期：400 {"error":"File must be an image"} 或 {"error":"File size limit is 5MB"}
curl -X POST "$BASE_URL/api/upload" \
  -H "Cookie: $SESSION_COOKIE" \
  -F "file=@/path/to/not-image.txt" \
  -F "type=avatar"
```

## Email 入站（Webhook）

```bash
# 用途：模拟邮件服务提供商 webhook（兼容 text/html 字段）
# 预期：200/201 {"success":true}；当用户不存在时 200 {"message":"User not found, email ignored"}
curl -X POST "$BASE_URL/api/email/inbound" \
  -F "from=Sender <sender@example.com>" \
  -F "to=targetuser@example.com" \
  -F "subject=Hello" \
  -F "text=Plain body" \
  -F "html=<p>HTML body</p>"

# 错误场景：缺少收件人或发件人
# 预期：400 {"error":"Missing recipient or sender"}
curl -X POST "$BASE_URL/api/email/inbound" \
  -F "subject=Missing to/from"
```

## 图片读取（示例）

```bash
# 用途：读取上传接口返回的代理图片 URL
# 预期：200 二进制图像
curl -X GET "$BASE_URL/api/images/$IMAGE_KEY" -o image.bin
```
