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

export class SandboxClient {
  private url: string;
  private token?: string;
  private static instance: SandboxClient;

  private constructor(url?: string, token?: string) {
    this.url = url || process.env.SANDBOX_URL || 'http://localhost:8080';
    this.token = token || process.env.SANDBOX_TOKEN;
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
}

export const sandboxClient = SandboxClient.getInstance();
