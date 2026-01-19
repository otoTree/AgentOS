const SERVER_URL = "http://localhost:3001/api/v1";

type AuthLoginRequest = {
    username: string;
    password: string;
};

type AuthRegisterRequest = {
    name: string;
    email: string;
    password: string;
};

type AuthResponse = {
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    token: string;
};

export type ToolCall = {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
};

export type ChatMessage = {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
};

export type ChatTool = {
    type: 'function';
    function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
    };
};

export type ChatCompletionRequest = {
    model?: string;
    messages: ChatMessage[];
    tools?: ChatTool[];
    tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    temperature?: number;
    max_tokens?: number;
};

export type ChatCompletionResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};

type EmbeddingsRequest = {
    model: string;
    input: string | string[];
};

type SkillsRunRequest = {
    input: Record<string, unknown>;
};

type DatasetUploadRequest = {
    file: Blob;
    teamId?: string;
    folderId?: string;
    fileId?: string;
};

type DatasetListQuery = {
    source: 'personal' | 'team';
    teamId?: string;
    parentId?: string;
};

type WorkbenchSkillCreateRequest = {
    teamId: string;
    name: string;
    description: string;
    emoji: string;
    isPublic: boolean;
};

type WorkbenchSkillUpdateRequest = Partial<WorkbenchSkillCreateRequest>;

type WorkbenchSkillFilesPutRequest = {
    files: Record<string, string>;
    metaUpdates?: Record<string, unknown>;
};

type WorkbenchSkillDeployRequest = {
    type: 'private' | 'public';
};

type ChatSessionCreateRequest = {
    title: string;
};

type ChatMessageCreateRequest = {
    sessionId: string;
    message: string;
    model: string;
};

export class ApiClient {
    private token: string | null = null;

    constructor(token?: string) {
        this.token = token || null;
    }

    setToken(token: string) {
        console.log("[ApiClient] Setting token, length:", token?.length);
        this.token = token;
    }

    private buildAuthHeader() {
        if (!this.token) {
            console.error("[ApiClient] buildAuthHeader failed: No token set");
            throw new Error("Authentication required");
        }
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }

    private async requestJson<T>(path: string, options?: {
        method?: string;
        body?: unknown;
        auth?: boolean;
        headers?: Record<string, string>;
    }) {
        const { method = 'GET', body, auth = true, headers = {} } = options || {};
        const requestHeaders: Record<string, string> = { ...headers };
        
        console.log(`[ApiClient] Requesting ${method} ${path}, auth=${auth}`);

        if (auth) {
            Object.assign(requestHeaders, this.buildAuthHeader());
        }
        if (body && !(body instanceof FormData)) {
            requestHeaders['Content-Type'] = 'application/json';
        }
        
        try {
            const response = await fetch(`${SERVER_URL}${path}`, {
                method,
                headers: requestHeaders,
                body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
            });
            if (!response.ok) {
                console.error(`[ApiClient] Request failed: ${response.status} ${response.statusText}`);
                throw new Error(`Server error: ${response.statusText}`);
            }
            return await response.json() as T;
        } catch (error) {
             console.error(`[ApiClient] Fetch error:`, error);
             throw error;
        }
    }

    private async requestVoid(path: string, options?: {
        method?: string;
        body?: unknown;
        auth?: boolean;
        headers?: Record<string, string>;
    }) {
        const { method = 'GET', body, auth = true, headers = {} } = options || {};
        const requestHeaders: Record<string, string> = { ...headers };
        if (auth) {
            Object.assign(requestHeaders, this.buildAuthHeader());
        }
        if (body && !(body instanceof FormData)) {
            requestHeaders['Content-Type'] = 'application/json';
        }
        const response = await fetch(`${SERVER_URL}${path}`, {
            method,
            headers: requestHeaders,
            body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }
    }

    async authLogin(body: AuthLoginRequest) {
        return this.requestJson<AuthResponse>('/auth/login', {
            method: 'POST',
            body,
            auth: false
        });
    }

    async authRegister(body: AuthRegisterRequest) {
        return this.requestJson<AuthResponse>('/auth/register', {
            method: 'POST',
            body,
            auth: false
        });
    }

    async health() {
        return this.requestJson<{ status: string }>('/health', { auth: false });
    }

    async chat(request: ChatCompletionRequest) {
        return this.requestJson<ChatCompletionResponse>('/ai/chat/completions', {
            method: 'POST',
            body: request
        });
    }

    async embeddings(request: EmbeddingsRequest) {
        return this.requestJson('/ai/embeddings', {
            method: 'POST',
            body: request
        });
    }

    async skillsList(teamId?: string) {
        const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
        return this.requestJson(`/skills${query}`, { method: 'GET' });
    }

    async skillsGet(id: string) {
        return this.requestJson(`/skills/${encodeURIComponent(id)}`, { method: 'GET' });
    }

    async skillsRun(id: string, request: SkillsRunRequest) {
        return this.requestJson(`/skills/${encodeURIComponent(id)}/run`, {
            method: 'POST',
            body: request
        });
    }

    async datasetUpload(request: DatasetUploadRequest) {
        const formData = new FormData();
        formData.append('file', request.file);
        if (request.teamId) {
            formData.append('teamId', request.teamId);
        }
        if (request.folderId) {
            formData.append('folderId', request.folderId);
        }
        if (request.fileId) {
            formData.append('fileId', request.fileId);
        }
        return this.requestJson('/dataset/upload', {
            method: 'POST',
            body: formData
        });
    }

    async datasetList(query: DatasetListQuery) {
        const params = new URLSearchParams();
        params.set('source', query.source);
        if (query.teamId) {
            params.set('teamId', query.teamId);
        }
        if (query.parentId) {
            params.set('parentId', query.parentId);
        }
        return this.requestJson(`/dataset?${params.toString()}`, { method: 'GET' });
    }

    async datasetFolderCreate(body: { name: string; parentId?: string; teamId?: string }) {
        return this.requestJson('/dataset/folder', {
            method: 'POST',
            body
        });
    }

    async datasetFolderDelete(id: string) {
        return this.requestVoid(`/dataset/folder/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async datasetFileDelete(id: string) {
        return this.requestVoid(`/dataset/file/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async workbenchSkillsCreate(body: WorkbenchSkillCreateRequest) {
        return this.requestJson('/workbench/skills', {
            method: 'POST',
            body
        });
    }

    async workbenchSkillsUpdate(id: string, body: WorkbenchSkillUpdateRequest) {
        return this.requestJson(`/workbench/skills/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body
        });
    }

    async workbenchSkillsDelete(id: string) {
        return this.requestVoid(`/workbench/skills/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async workbenchSkillsFilesGet(id: string, params: { filename: string; raw?: boolean }) {
        const search = new URLSearchParams();
        search.set('filename', params.filename);
        if (params.raw !== undefined) {
            search.set('raw', String(params.raw));
        }
        return this.requestJson(`/workbench/skills/${encodeURIComponent(id)}/files?${search.toString()}`, { method: 'GET' });
    }

    async workbenchSkillsFilesPut(id: string, body: WorkbenchSkillFilesPutRequest) {
        return this.requestJson(`/workbench/skills/${encodeURIComponent(id)}/files`, {
            method: 'PUT',
            body
        });
    }

    async workbenchSkillsFilesDelete(id: string, filename: string) {
        const search = new URLSearchParams();
        search.set('filename', filename);
        return this.requestVoid(`/workbench/skills/${encodeURIComponent(id)}/files?${search.toString()}`, { method: 'DELETE' });
    }

    async workbenchSkillsDeploy(id: string, body: WorkbenchSkillDeployRequest) {
        return this.requestJson(`/workbench/skills/${encodeURIComponent(id)}/deploy`, {
            method: 'POST',
            body
        });
    }

    async adminModelProvidersList() {
        return this.requestJson('/admin/models/providers', { method: 'GET' });
    }

    async adminModelProvidersCreate(body: Record<string, unknown>) {
        return this.requestJson('/admin/models/providers', {
            method: 'POST',
            body
        });
    }

    async adminModelProvidersDelete(id: string) {
        return this.requestVoid(`/admin/models/providers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async adminModelProvidersTest(id: string) {
        return this.requestJson(`/admin/models/providers/${encodeURIComponent(id)}/test`, { method: 'GET' });
    }

    async adminProviderModelsCreate(providerId: string, body: Record<string, unknown>) {
        return this.requestJson(`/admin/models/providers/${encodeURIComponent(providerId)}/models`, {
            method: 'POST',
            body
        });
    }

    async adminModelsUpdate(id: string, body: Record<string, unknown>) {
        return this.requestJson(`/admin/models/models/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body
        });
    }

    async adminModelsDelete(id: string) {
        return this.requestVoid(`/admin/models/models/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async chatSessionsList() {
        return this.requestJson('/chat/sessions', { method: 'GET' });
    }

    async chatSessionsCreate(body: ChatSessionCreateRequest) {
        return this.requestJson('/chat/sessions', {
            method: 'POST',
            body
        });
    }

    async chatSessionsDelete(id: string) {
        return this.requestVoid(`/chat/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }

    async chatSessionMessages(id: string) {
        return this.requestJson(`/chat/sessions/${encodeURIComponent(id)}/messages`, { method: 'GET' });
    }

    async chatMessageSend(body: ChatMessageCreateRequest) {
        return this.requestJson('/chat/message', {
            method: 'POST',
            body
        });
    }
}

export const apiClient = new ApiClient();
