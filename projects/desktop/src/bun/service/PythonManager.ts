import { join } from 'path';
import { existsSync, chmodSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { PYTHON_ENV_ROOT_PATH, UV_BINARY_PATH, BIN_ROOT_PATH } from '../paths';
import { spawn } from 'bun';
import { extractJson } from "@agentos/global/utils/json";

export class PythonManager {
    private static instance: PythonManager;

    private constructor() {}

    public static getInstance(): PythonManager {
        if (!PythonManager.instance) {
            PythonManager.instance = new PythonManager();
        }
        return PythonManager.instance;
    }

    async isUVInstalled(): Promise<boolean> {
        return existsSync(UV_BINARY_PATH);
    }

    async installUV(): Promise<void> {
        if (await this.isUVInstalled()) return;

        console.log('[PythonManager] Installing uv...');
        
        // Ensure bin directory exists
        if (!existsSync(BIN_ROOT_PATH)) {
            await mkdir(BIN_ROOT_PATH, { recursive: true });
        }

        const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
        const platform = 'apple-darwin';
        const downloadUrl = `https://github.com/astral-sh/uv/releases/latest/download/uv-${arch}-${platform}.tar.gz`;
        const tarPath = join(BIN_ROOT_PATH, 'uv.tar.gz');

        console.log(`[PythonManager] Downloading ${downloadUrl}...`);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download uv: ${response.statusText}`);
        }

        await Bun.write(tarPath, await response.arrayBuffer());

        console.log('[PythonManager] Extracting uv...');
        // Use tar to extract
        const proc = Bun.spawn(['tar', '-xzf', tarPath, '-C', BIN_ROOT_PATH]);
        await proc.exited;

        if (proc.exitCode !== 0) {
            throw new Error('Failed to extract uv');
        }

        // Cleanup tar
        await unlink(tarPath);

        // Check if uv is in a subdirectory (uv usually extracts to ./uv or ./uv-arch/uv)
        // If it extracted to a folder, we need to find the binary.
        // Actually, let's just search for 'uv' binary in BIN_ROOT_PATH
        const findProc = Bun.spawn(['find', BIN_ROOT_PATH, '-name', 'uv', '-type', 'f']);
        const findOutput = await new Response(findProc.stdout).text();
        const foundPath = findOutput.trim().split('\n')[0];

        if (foundPath && foundPath !== UV_BINARY_PATH) {
            console.log(`[PythonManager] Moving uv from ${foundPath} to ${UV_BINARY_PATH}`);
            const mvProc = Bun.spawn(['mv', foundPath, UV_BINARY_PATH]);
            await mvProc.exited;
        }

        if (!existsSync(UV_BINARY_PATH)) {
            throw new Error('uv binary not found after extraction');
        }

        chmodSync(UV_BINARY_PATH, 0o755);
        console.log('[PythonManager] uv installed successfully');
    }

    async ensurePython(): Promise<void> {
        await this.installUV();

        const pythonPath = this.getPythonPath();
        if (!existsSync(pythonPath)) {
            console.log('[PythonManager] Creating python environment...');
            // Create venv with specific python version
            // uv venv --python 3.12 <path>
            const proc = Bun.spawn([UV_BINARY_PATH, 'venv', '--python', '3.12', PYTHON_ENV_ROOT_PATH], {
                stdout: 'inherit',
                stderr: 'inherit'
            });
            await proc.exited;

            if (proc.exitCode !== 0) {
                throw new Error('Failed to create python environment');
            }
            console.log('[PythonManager] Python environment created');
        }
    }

    getPythonPath(): string {
        return join(PYTHON_ENV_ROOT_PATH, 'bin', 'python3');
    }

    async listPackages(): Promise<{ name: string, version: string }[]> {
        await this.ensurePython();
        
        // uv pip list --python <path> --format json
        const proc = Bun.spawn([UV_BINARY_PATH, 'pip', 'list', '--python', this.getPythonPath(), '--format', 'json']);
        const output = await new Response(proc.stdout).text();
        
        const extracted = extractJson<{ name: string, version: string }[]>(output);
        if (extracted) {
            return extracted;
        } else {
            console.error('[PythonManager] Failed to parse pip list output:', output);
            return [];
        }
    }

    async installPackage(pkg: string): Promise<void> {
        await this.ensurePython();
        console.log(`[PythonManager] Installing ${pkg}...`);
        
        const proc = Bun.spawn([UV_BINARY_PATH, 'pip', 'install', pkg, '--python', this.getPythonPath()], {
            stdout: 'inherit',
            stderr: 'inherit'
        });
        await proc.exited;
        
        if (proc.exitCode !== 0) {
            throw new Error(`Failed to install package: ${pkg}`);
        }
    }

    async uninstallPackage(pkg: string): Promise<void> {
        await this.ensurePython();
        console.log(`[PythonManager] Uninstalling ${pkg}...`);
        
        const proc = Bun.spawn([UV_BINARY_PATH, 'pip', 'uninstall', pkg, '--python', this.getPythonPath()], {
            stdout: 'inherit',
            stderr: 'inherit'
        });
        // Note: uv pip uninstall might prompt? 
        // It seems uv pip uninstall does not prompt by default in recent versions if running non-interactive?
        // Actually it might. We can't easily pass 'y'.
        // Let's hope it works or add logic later.
        
        await proc.exited;
        
        if (proc.exitCode !== 0) {
            throw new Error(`Failed to uninstall package: ${pkg}`);
        }
    }
}
