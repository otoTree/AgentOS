import { z } from 'zod';

const PackageSchema = z.object({
  name: z.string(),
  version: z.string(),
});

const PackagesResponseSchema = z.object({
  packages: z.array(PackageSchema),
});

export type SandboxPackage = z.infer<typeof PackageSchema>;

const NetworkConfigSchema = z.object({
  allowedDomains: z.array(z.string()),
  deniedDomains: z.array(z.string()).optional(),
  allowLocalBinding: z.boolean().optional(),
  allowUnixSockets: z.array(z.string()).optional(),
});

const FilesystemConfigSchema = z.object({
  denyRead: z.array(z.string()).optional(),
  allowWrite: z.array(z.string()).optional(),
  denyWrite: z.array(z.string()).optional(),
});

const SandboxConfigSchema = z.object({
  network: NetworkConfigSchema,
  filesystem: FilesystemConfigSchema,
});

export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

const ExecuteResponseSchema = z.object({
  executionId: z.string(),
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  uploads: z.array(z.any()).optional(),
});

export type ExecuteResult = z.infer<typeof ExecuteResponseSchema>;

const DeploymentSchema = z.object({
  sandboxId: z.string(),
  entry: z.string(),
  metaUrl: z.string().optional(),
  namespace: z.string().optional(),
  workDir: z.string(),
});

const DeploymentsResponseSchema = z.object({
  deployments: z.array(DeploymentSchema),
});

export type SandboxDeployment = z.infer<typeof DeploymentSchema>;

export class SandboxClient {
  private url: string;
  private token?: string;
  private static instance: SandboxClient;

  private constructor(url?: string, token?: string) {
    this.url = url || process.env.SANDBOX_URL || 'http://localhost:8080';
    this.token = token || process.env.SANDBOX_TOKEN;
    console.log('[SandboxClient] Initialized with URL:', this.url);
  }

  public static getInstance(): SandboxClient {
    if (!SandboxClient.instance) {
      SandboxClient.instance = new SandboxClient();
    }
    return SandboxClient.instance;
  }

  /**
   * Fetch installed packages from sandbox service
   */
  async getPackages(): Promise<SandboxPackage[]> {
    if (!this.token) {
        // Fallback for dev environment without sandbox service configured
        if (process.env.NODE_ENV === 'development') {
            console.warn('SANDBOX_TOKEN not set, returning empty package list');
        }
        return [];
    }
    
    try {
      const res = await fetch(`${this.url}/python/packages`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(`Sandbox service returned ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      const parsed = PackagesResponseSchema.safeParse(data);
      
      if (!parsed.success) {
          console.error('Invalid response format from sandbox:', parsed.error);
          return [];
      }

      return parsed.data.packages;
    } catch (e) {
      console.error('Failed to fetch sandbox packages:', e);
      throw e;
    }
  }

  /**
   * Get package list formatted as "name==version"
   */
  async getPackageSpecifiers(): Promise<string[]> {
      const packages = await this.getPackages();
      return packages.map(p => `${p.name}==${p.version}`);
  }

  /**
   * Get comma-separated list of package names (for prompts)
   */
  async getPackageNamesString(): Promise<string> {
      const packages = await this.getPackages();
      return packages.map(p => p.name).join(', ');
  }

  /**
   * Install or uninstall packages
   */
  async managePackages(action: 'install' | 'uninstall', packages: string[]): Promise<void> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    const res = await fetch(`${this.url}/python/packages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ action, packages })
    });

    if (!res.ok) {
        throw new Error(`Failed to ${action} packages: ${await res.text()}`);
    }
  }

  /**
   * Get sandbox configuration
   */
  async getConfig(): Promise<SandboxConfig | null> {
    if (!this.token) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('SANDBOX_TOKEN not set, returning null config');
        }
        return null;
    }

    try {
      const res = await fetch(`${this.url}/config`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Sandbox service returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const parsed = SandboxConfigSchema.safeParse(data);

      if (!parsed.success) {
          console.error('Invalid config format from sandbox:', parsed.error);
          return null;
      }

      return parsed.data;
    } catch (e) {
      console.error('Failed to fetch sandbox config:', e);
      throw e;
    }
  }

  /**
   * Update allowed domains
   */
  async updateAllowedDomains(domains: string[]): Promise<void> {
    if (!this.token) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('SANDBOX_TOKEN not set, skipping allowed domains update');
            return;
        }
        throw new Error('SANDBOX_TOKEN not configured');
    }

    const res = await fetch(`${this.url}/config/allowed-domains`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ domains })
    });

    if (!res.ok) {
        throw new Error(`Failed to update allowed domains: ${await res.text()}`);
    }
  }

  /**
   * Check sandbox health
   */
  async checkHealth(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await fetch(`${this.url}/health`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Execute Python code
   */
  async executeCode(code: string, options: { 
    timeoutMs?: number, 
    fileUploadUrl?: string, 
    uploadToken?: string,
    isPublic?: boolean
  } = {}): Promise<ExecuteResult> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    const body: any = { code };
    if (options.timeoutMs) body.timeoutMs = options.timeoutMs;
    if (options.fileUploadUrl) body.fileUploadUrl = options.fileUploadUrl;
    if (options.uploadToken) body.uploadToken = options.uploadToken;
    if (options.isPublic !== undefined) body.public = options.isPublic;

    const res = await fetch(`${this.url}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Execution failed: ${await res.text()}`);
    }

    const data = await res.json();
    const parsed = ExecuteResponseSchema.safeParse(data);
    
    if (!parsed.success) {
      throw new Error(`Invalid execution response: ${parsed.error}`);
    }

    return parsed.data;
  }

  /**
   * Create a new deployment
   */
  async createDeployment(params: {
    sandboxId: string;
    code: string;
    entry?: string;
    metaUrl?: string; // Made optional to match usage, but actually backend requires it?
    isPublic?: boolean;
    namespace?: string;
  }): Promise<SandboxDeployment> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    try {
        const res = await fetch(`${this.url}/deploy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
              ...params,
              metaUrl: params.metaUrl || `s3://agentos/skills/${params.sandboxId}/meta.json` 
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to create deployment: ${await res.text()}`);
        }

        const data = await res.json();
        return data as SandboxDeployment;
    } catch (e: any) {
        console.error(`[SandboxClient] Create Deployment Failed. URL: ${this.url}/deploy`, e);
        if (e.cause) console.error('[SandboxClient] Error Cause:', e.cause);
        throw e;
    }
  }

  /**
   * List all deployments
   */
  async listDeployments(): Promise<SandboxDeployment[]> {
    if (!this.token) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('SANDBOX_TOKEN not set, returning empty deployment list');
        }
        return [];
    }

    try {
      const res = await fetch(`${this.url}/deploy`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Sandbox service returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const parsed = DeploymentsResponseSchema.safeParse(data);

      if (!parsed.success) {
          console.error('Invalid response format from sandbox:', parsed.error);
          return [];
      }

      return parsed.data.deployments;
    } catch (e) {
      console.error('Failed to fetch deployments:', e);
      throw e;
    }
  }

  /**
   * Get deployment details
   */
  async getDeployment(sandboxId: string): Promise<SandboxDeployment | null> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    try {
      const res = await fetch(`${this.url}/deploy/${sandboxId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (res.status === 404) return null;

      if (!res.ok) {
        throw new Error(`Sandbox service returned ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const parsed = DeploymentSchema.safeParse(data);

      if (!parsed.success) {
          throw new Error(`Invalid deployment format: ${parsed.error}`);
      }

      return parsed.data;
    } catch (e) {
      console.error(`Failed to fetch deployment ${sandboxId}:`, e);
      throw e;
    }
  }

  /**
   * Delete deployment
   */
  async deleteDeployment(sandboxId: string): Promise<boolean> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    const res = await fetch(`${this.url}/deploy/${sandboxId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return res.ok;
  }

  /**
   * Call deployed service
   */
  async callService(sandboxId: string, data: any, options: {
    fileUploadUrl?: string,
    uploadToken?: string,
    isPublic?: boolean
  } = {}): Promise<any> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    const body: any = { data };
    if (options.fileUploadUrl) body.fileUploadUrl = options.fileUploadUrl;
    if (options.uploadToken) body.uploadToken = options.uploadToken;
    if (options.isPublic !== undefined) body.public = options.isPublic;

    const res = await fetch(`${this.url}/services/${sandboxId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Service call failed: ${await res.text()}`);
    }

    return await res.json();
  }

  /**
   * Download file from service invocation
   */
  async getServiceFile(executionId: string, filename: string): Promise<ArrayBuffer> {
    if (!this.token) throw new Error('SANDBOX_TOKEN not configured');

    const res = await fetch(`${this.url}/invokes/${executionId}/files/${filename}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!res.ok) {
      throw new Error(`Failed to download service file: ${await res.text()}`);
    }

    return await res.arrayBuffer();
  }
}

export const sandboxClient = SandboxClient.getInstance();
