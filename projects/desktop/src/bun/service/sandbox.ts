import { SandboxManager, type SandboxRuntimeConfig } from '../../sandbox-runtime/src/index';
import { spawn } from 'bun';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ARTIFACTS_ROOT_PATH } from '../paths';

export interface Artifact {
  path: string; // Relative path
  absolutePath: string; // Absolute persistent path
  mimeType: string;
  type: 'text' | 'binary';
}

export class SandboxService {
  private initialized = false;
  private workspacePath: string;
  private artifactsPath: string;

  constructor(workspacePath?: string) {
    this.workspacePath = workspacePath || path.join(os.tmpdir(), 'agentos-sandbox');
    this.artifactsPath = ARTIFACTS_ROOT_PATH;
  }

  async initialize() {
    if (this.initialized) return;

    // Ensure workspace exists
    await fs.mkdir(this.workspacePath, { recursive: true });
    // Ensure artifacts directory exists
    await fs.mkdir(this.artifactsPath, { recursive: true });

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
    console.log(`[SandboxService] Artifacts path: ${this.artifactsPath}`);
  }

  async runScript(code: string, language: string = 'python'): Promise<{ output: string, error: string, artifacts: Artifact[] }> {
    if (!this.initialized) await this.initialize();

    // Create a unique temporary directory for this execution
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const executionPath = path.join(this.workspacePath, executionId);
    await fs.mkdir(executionPath, { recursive: true });

    const scriptFilename = `script.${language === 'python' ? 'py' : language === 'bash' ? 'sh' : 'js'}`;
    const scriptFilePath = path.join(executionPath, scriptFilename);
    await fs.writeFile(scriptFilePath, code);

    return this.executeInternal(executionId, executionPath, scriptFilename, language);
  }

  async runScriptFile(scriptPath: string, language?: string): Promise<{ output: string, error: string, artifacts: Artifact[] }> {
    if (!this.initialized) await this.initialize();

    if (!await fs.exists(scriptPath)) {
      throw new Error(`Script file not found: ${scriptPath}`);
    }

    if (!language) {
      const ext = path.extname(scriptPath).toLowerCase();
      if (ext === '.py') language = 'python';
      else if (ext === '.js') language = 'javascript';
      else if (ext === '.sh') language = 'bash';
      else throw new Error(`Could not infer language from file extension: ${ext}. Please specify language.`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const executionPath = path.join(this.workspacePath, executionId);
    await fs.mkdir(executionPath, { recursive: true });

    const scriptFilename = path.basename(scriptPath);
    const targetScriptPath = path.join(executionPath, scriptFilename);
    await fs.copyFile(scriptPath, targetScriptPath);

    return this.executeInternal(executionId, executionPath, scriptFilename, language);
  }

  private async executeInternal(executionId: string, executionPath: string, scriptFilename: string, language: string): Promise<{ output: string, error: string, artifacts: Artifact[] }> {
    const scriptFilePath = path.join(executionPath, scriptFilename);
    let command = '';
    if (language === 'python') {
      command = `python3 ${scriptFilePath}`;
    } else if (language === 'javascript' || language === 'node') {
      command = `node ${scriptFilePath}`;
    } else if (language === 'bash') {
        await fs.chmod(scriptFilePath, 0o755);
        command = `/bin/bash ${scriptFilePath}`;
    } else {
        throw new Error(`Unsupported language: ${language}`);
    }

    try {
        const sandboxedCommandStr = await SandboxManager.wrapWithSandbox(command);
        console.log(`[SandboxService] Running: ${sandboxedCommandStr}`);

        // wrapWithSandbox returns a shell command string. 
        // We use sh -c to execute it properly handling quotes and arguments.
        const proc = spawn(['/bin/sh', '-c', sandboxedCommandStr], {
            cwd: executionPath,
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        
        await proc.exited;

        // Collect Artifacts
        const artifacts: Artifact[] = [];
        try {
            const files = await fs.readdir(executionPath, { recursive: true });
            
            // Create a persistent directory for this execution's artifacts
            // e.g. ~/Desktop/AgentOS/artifacts/exec_123456
            const persistentExecPath = path.join(this.artifactsPath, executionId);
            let hasArtifacts = false;

            for (const file of files) {
                // Skip the script file itself and directories (readdir recursive returns paths, we need to check stats)
                // Note: bun fs.readdir with recursive returns relative paths
                if (file === scriptFilename) continue;

                const absPath = path.join(executionPath, file);
                const stat = await fs.stat(absPath);
                
                if (stat.isFile()) {
                    if (!hasArtifacts) {
                        await fs.mkdir(persistentExecPath, { recursive: true });
                        hasArtifacts = true;
                    }

                    // Determine mime type
                    const bunFile = Bun.file(absPath);
                    const mimeType = bunFile.type || 'application/octet-stream';
                    
                    // Simple heuristic for text vs binary
                    const isText = mimeType.startsWith('text/') || 
                                   mimeType === 'application/json' || 
                                   mimeType === 'application/javascript' ||
                                   file.endsWith('.py') || file.endsWith('.md') || file.endsWith('.csv');

                    const type: 'text' | 'binary' = isText ? 'text' : 'binary';
                    
                    // Move file to persistent storage
                    // Maintain directory structure if file is in a subdir (relative to execution root)
                    const targetPath = path.join(persistentExecPath, file);
                    const targetDir = path.dirname(targetPath);
                    if (targetDir !== persistentExecPath) {
                        await fs.mkdir(targetDir, { recursive: true });
                    }
                    
                    await fs.copyFile(absPath, targetPath);

                    artifacts.push({
                        path: file,
                        absolutePath: targetPath,
                        mimeType,
                        type
                    });
                }
            }
        } catch (artifactError) {
            console.error(`[SandboxService] Error collecting artifacts:`, artifactError);
        }

        // Cleanup
        try {
          await fs.rm(executionPath, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error(`[SandboxService] Failed to cleanup execution path: ${executionPath}`, cleanupError);
        }

        return { output: stdout, error: stderr, artifacts };
    } catch (e: any) {
        console.error(`[SandboxService] Error:`, e);
        // Attempt cleanup on error as well
        try {
          await fs.rm(executionPath, { recursive: true, force: true });
        } catch (cleanupError) {
             console.error(`[SandboxService] Failed to cleanup execution path after error: ${executionPath}`, cleanupError);
        }
        return { output: '', error: e.message || String(e), artifacts: [] };
    }
  }
}
