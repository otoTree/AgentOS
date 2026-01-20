import { SandboxManager, type SandboxRuntimeConfig } from '../../sandbox-runtime/src/index';
import { spawn } from 'bun';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export class SandboxService {
  private initialized = false;
  private workspacePath: string;

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath || path.join(os.tmpdir(), 'agentos-sandbox');
  }

  async initialize() {
    if (this.initialized) return;

    // Ensure workspace exists
    await fs.mkdir(this.workspacePath, { recursive: true });

    const config: SandboxRuntimeConfig = {
      network: {
        allowedDomains: ["*"], // Allow all for now
        deniedDomains: [],
        allowLocalBinding: true,
      },
      filesystem: {
        denyRead: [],
        allowWrite: [this.workspacePath],
        denyWrite: [],
      },
      // Assuming we are on macOS for now based on env
    };

    // Initialize the sandbox manager
    await SandboxManager.initialize(config);
    this.initialized = true;
    console.log(`[SandboxService] Initialized with workspace: ${this.workspacePath}`);
  }

  async runScript(code: string, language: string = 'python'): Promise<{ output: string, error: string }> {
    if (!this.initialized) await this.initialize();

    const filename = `script_${Date.now()}.${language === 'python' ? 'py' : 'js'}`;
    const filePath = path.join(this.workspacePath, filename);
    await fs.writeFile(filePath, code);

    let command = '';
    if (language === 'python') {
      command = `python3 ${filePath}`;
    } else if (language === 'javascript' || language === 'node') {
      command = `node ${filePath}`;
    } else if (language === 'bash') {
        await fs.chmod(filePath, 0o755);
        command = `/bin/bash ${filePath}`;
    } else {
        throw new Error(`Unsupported language: ${language}`);
    }

    try {
        const sandboxedCommandStr = await SandboxManager.wrapWithSandbox(command);
        console.log(`[SandboxService] Running: ${sandboxedCommandStr}`);

        // wrapWithSandbox returns a shell command string. 
        // We use sh -c to execute it properly handling quotes and arguments.
        const proc = spawn(['/bin/sh', '-c', sandboxedCommandStr], {
            cwd: this.workspacePath,
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        
        await proc.exited;

        // Cleanup
        // await fs.unlink(filePath); 

        return { output: stdout, error: stderr };
    } catch (e: any) {
        console.error(`[SandboxService] Error:`, e);
        return { output: '', error: e.message || String(e) };
    }
  }
}
