# API Documentation

## System

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "ok": true
}
```

---

## Execution

### Execute Python Code

**Endpoint:** `POST /execute`

Executes Python code in a sandboxed environment.

**Request Body:**

```json
{
  "code": "print('Hello World')",
  "timeoutMs": 5000,
  "fileUploadUrl": "https://example.com/upload",
  "uploadToken": "your-token",
  "public": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | The Python code to execute. |
| `timeoutMs` | number | No | Execution timeout in milliseconds (1-120000). |
| `fileUploadUrl` | string | No | URL to upload generated files to. |
| `uploadToken` | string | No | Bearer token for file upload. |
| `public` | boolean | No | Whether the uploaded files should be public. |

**Response:**

```json
{
  "exitCode": 0,
  "signal": null,
  "stdout": "Hello World\n",
  "stderr": "",
  "uploads": []
}
```

| Field | Type | Description |
|---|---|---|
| `exitCode` | number \| null | The exit code of the process. |
| `signal` | string \| null | The signal that terminated the process. |
| `stdout` | string | Standard output. |
| `stderr` | string | Standard error (annotated with sandbox failures if any). |
| `uploads` | array | List of uploaded files. |

---

## Browser

### Create Session

**Endpoint:** `POST /browser/sessions`

Creates a new browser session.

**Request Body:**

```json
{
  "device": "desktop",
  "viewport": {
    "width": 1280,
    "height": 720
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `device` | string | No | 'desktop' or 'mobile'. |
| `viewport` | object | No | Viewport dimensions (`width`, `height`). |

**Response:**

```json
{
  "sessionId": "uuid-string"
}
```

### Destroy Session

**Endpoint:** `DELETE /browser/sessions/:id`

Terminates a browser session.

**Response:**

```json
{
  "success": true
}
```

### Navigate

**Endpoint:** `POST /browser/sessions/:id/navigate`

Navigates to a URL.

**Request Body:**

```json
{
  "url": "https://example.com",
  "waitUntil": "networkidle",
  "tabId": "optional-tab-id"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | The URL to navigate to. |
| `waitUntil` | string | No | 'load', 'domcontentloaded', 'networkidle', 'commit'. |
| `tabId` | string | No | The ID of the tab to navigate. Defaults to active tab. |

**Response:**

```json
{
  "url": "https://example.com",
  "screenshot": "base64-string",
  "tabId": "tab-id"
}
```

### Perform Action

**Endpoint:** `POST /browser/sessions/:id/action`

Performs an action on the page.

**Request Body:**

```json
{
  "action": "click",
  "selector": "#submit-button",
  "x": 100,
  "y": 200,
  "value": "text to type",
  "script": "return document.title",
  "tabId": "optional-tab-id"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string | Yes | 'click', 'fill', 'screenshot', 'evaluate', 'press', 'type', 'scroll'. |
| `selector` | string | No | CSS selector. |
| `x` | number | No | X coordinate. |
| `y` | number | No | Y coordinate. |
| `value` | string | No | Value for 'fill', 'type', or key for 'press'. |
| `script` | string | No | JavaScript code for 'evaluate'. |
| `tabId` | string | No | Target tab ID. |

**Response:**

```json
{
  "result": null,
  "screenshot": "base64-string",
  "url": "https://example.com",
  "tabId": "tab-id"
}
```

### Get Content

**Endpoint:** `GET /browser/sessions/:id/content`

Gets the HTML content of the page.

**Query Parameters:**
- `tabId` (optional): The ID of the tab.

**Response:**
HTML content string (Content-Type: `text/html`).

### Get Tabs

**Endpoint:** `GET /browser/sessions/:id/tabs`

Lists all open tabs in the session.

**Response:**

```json
[
  {
    "id": "tab-id",
    "url": "https://example.com",
    "title": "Example Domain",
    "active": true
  }
]
```

### Create Tab

**Endpoint:** `POST /browser/sessions/:id/tabs`

Creates a new tab.

**Response:**

```json
{
  "tabId": "new-tab-id"
}
```

### Close Tab

**Endpoint:** `DELETE /browser/sessions/:id/tabs/:tabId`

Closes a specific tab.

**Response:**

```json
{
  "success": true
}
```
