import { Skill } from "@agentos/agent";

export type ChatRequest = {
  message: string;
  sessionId: string;
};

export type ChatResponse = {
  content: string;
  toolCalls?: { name: string; args: string; status: 'running' | 'done'; result?: string }[];
};

export type RPCMessage = {
  id: string;
  role: string;
  content: string;
  created_at: number;
}

export type GetHistoryRequest = {
  sessionId?: string;
};

export type GetHistoryResponse = {
  messages: RPCMessage[];
};

export type SetTokenRequest = {
  token: string;
};

export type SetTokenResponse = {
  success: boolean;
};

export type RunScriptRequest = {
  code: string;
  language: string;
};

export type RunScriptResponse = {
  output: string;
  error: string;
};

// Skill RPC Types
export type GenerateSkillRequest = {
  prompt: string;
};

export type GenerateSkillResponse = {
  success: boolean;
  skillName?: string;
  error?: string;
};

export type ListSkillsRequest = {};

export type ListSkillsResponse = {
  skills: Skill[];
};

export type PublishSkillRequest = {
  skillName: string;
};

export type PublishSkillResponse = {
  success: boolean;
  skillId?: string;
  error?: string;
};

export type DeleteSkillRequest = {
  skillName: string;
};

export type DeleteSkillResponse = {
  success: boolean;
  error?: string;
};

// Skill File System RPC Types
export type SkillFile = {
  name: string;
  path: string; // Relative path
  type: 'file' | 'directory';
  children?: SkillFile[];
};

export type SkillFsListRequest = {
  skillName: string;
  path?: string; // Relative path, default root
};

export type SkillFsListResponse = {
  files: SkillFile[];
  error?: string;
};

export type SkillFsReadRequest = {
  skillName: string;
  path: string;
};

export type SkillFsReadResponse = {
  content: string;
  error?: string;
};

export type SkillFsWriteRequest = {
  skillName: string;
  path: string;
  content: string;
};

export type SkillFsWriteResponse = {
  success: boolean;
  error?: string;
};

export type SkillFsCreateDirectoryRequest = {
  skillName: string;
  path: string;
};

export type SkillFsCreateDirectoryResponse = {
  success: boolean;
  error?: string;
};

export type SkillFsRenameRequest = {
  skillName: string;
  oldPath: string;
  newPath: string;
};

export type SkillFsRenameResponse = {
  success: boolean;
  error?: string;
};

export type SkillFsDeleteRequest = {
  skillName: string;
  path: string;
};

export type SkillFsDeleteResponse = {
  success: boolean;
  error?: string;
};

export type AgentRPCSchema = {
  bun: {
    requests: {
      chat: {
        params: ChatRequest;
        returns: ChatResponse;
      };
      getHistory: {
        params: GetHistoryRequest;
        returns: GetHistoryResponse;
      };
      setToken: {
        params: SetTokenRequest;
        returns: SetTokenResponse;
      };
      runScript: {
        params: RunScriptRequest;
        returns: RunScriptResponse;
      };
      // Skill RPCs
      generateSkill: {
        params: GenerateSkillRequest;
        returns: GenerateSkillResponse;
      };
      listSkills: {
        params: ListSkillsRequest;
        returns: ListSkillsResponse;
      };
      publishSkill: {
        params: PublishSkillRequest;
        returns: PublishSkillResponse;
      };
      deleteSkill: {
        params: DeleteSkillRequest;
        returns: DeleteSkillResponse;
      };
      // Skill File System RPCs
      skillFsList: {
        params: SkillFsListRequest;
        returns: SkillFsListResponse;
      };
      skillFsRead: {
        params: SkillFsReadRequest;
        returns: SkillFsReadResponse;
      };
      skillFsWrite: {
        params: SkillFsWriteRequest;
        returns: SkillFsWriteResponse;
      };
      skillFsCreateDirectory: {
        params: SkillFsCreateDirectoryRequest;
        returns: SkillFsCreateDirectoryResponse;
      };
      skillFsRename: {
        params: SkillFsRenameRequest;
        returns: SkillFsRenameResponse;
      };
      skillFsDelete: {
        params: SkillFsDeleteRequest;
        returns: SkillFsDeleteResponse;
      };
      // Python RPCs
      listPythonPackages: {
        params: ListPythonPackagesRequest;
        returns: ListPythonPackagesResponse;
      };
      installPythonPackage: {
        params: InstallPythonPackageRequest;
        returns: InstallPythonPackageResponse;
      };
      uninstallPythonPackage: {
        params: UninstallPythonPackageRequest;
        returns: UninstallPythonPackageResponse;
      };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      chunk: { content: string };
      tool_start: { sessionId?: string; name: string; args: any };
      tool_end: { sessionId?: string; name: string; output: any };
    };
  };
};

// Python RPC Types
export type PythonPackage = {
  name: string;
  version: string;
};

export type ListPythonPackagesRequest = {};
export type ListPythonPackagesResponse = {
  packages: PythonPackage[];
};

export type InstallPythonPackageRequest = {
  pkg: string;
};
export type InstallPythonPackageResponse = {
  success: boolean;
  error?: string;
};

export type UninstallPythonPackageRequest = {
  pkg: string;
};
export type UninstallPythonPackageResponse = {
  success: boolean;
  error?: string;
};
