import { spawn } from 'child_process'
import { promises as fsp } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { sandboxConfig, STORAGE_CONFIG } from '../config.js'
import { fetch } from 'undici'
import { randomUUID } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { uploadFiles, cacheToLocalBucket, walk, UploadConfig, UploadResult } from '../utils/file-utils.js'

export type Deployment = {
  sandboxId: string
  workDir: string
  entry: string
  namespace?: string
  metaUrl: string
}

export type MetaFile = {
  path: string
  url: string
}

export type ProjectMeta = {
  entry: string
  files: MetaFile[]
}

class DeployManager {
  private deployments = new Map<string, Deployment>()

  constructor() {
    this.ensureBucketDir()
  }

  private async ensureBucketDir() {
    try {
      await fsp.mkdir(STORAGE_CONFIG.bucketDir, { recursive: true })
    } catch (err) {
      console.error('Failed to create bucket directory:', err)
    }
  }

  async deploy(metaUrl: string, namespace?: string, strategy: 'clean' | 'reuse' = 'clean') {
    // 1. Fetch Meta
    const metaRes = await fetch(metaUrl)
    if (!metaRes.ok) throw new Error(`Failed to fetch meta.json: ${metaRes.statusText}`)
    const meta = (await metaRes.json()) as ProjectMeta
    
    if (!meta.entry) throw new Error('meta.json must contain "entry"')

    // 2. Prepare Directory
    const tmpPrefix = path.join(os.tmpdir(), 'sandbox-deploy-')
    const workDir = await fsp.mkdtemp(tmpPrefix)

    // 3. Download Files
    if (meta.files) {
      await Promise.all(meta.files.map(async (file) => {
        if (!file.url) return
        const res = await fetch(file.url)
        if (!res.ok) throw new Error(`Failed to download ${file.path}`)
        const content = await res.arrayBuffer()
        const filePath = path.join(workDir, file.path)
        await fsp.mkdir(path.dirname(filePath), { recursive: true })
        await fsp.writeFile(filePath, Buffer.from(content))
      }))
    }

    // 4. Register Deployment (No process started yet)
    const sandboxId = randomUUID()

    const deployment: Deployment = {
      sandboxId,
      workDir,
      entry: meta.entry,
      metaUrl,
      namespace
    }
    
    this.deployments.set(sandboxId, deployment)
    
    return {
      sandboxId,
      message: 'Project deployed successfully'
    }
  }

  async invoke(sandboxId: string, data: any, uploadConfig?: UploadConfig): Promise<{ executionId: string, result: string, uploads: UploadResult[] }> {
    const deployment = this.deployments.get(sandboxId)
    if (!deployment) throw new Error('Sandbox not found')
    
    // Ensure Sandbox Initialized
    if (!SandboxManager.isSandboxingEnabled()) {
        await SandboxManager.initialize(sandboxConfig)
    }

    const executionId = uuidv4()

    // 1. Snapshot files before execution to identify new/modified files
    const initialFiles = await walk(deployment.workDir)
    const initialFilesSet = new Set(initialFiles)

    const venvPython = path.join(process.cwd(), process.env.PYTHON_VENV || 'python-venv/bin/python')
    const cmd = `${venvPython} -u ${deployment.entry}`
    const wrapped = await SandboxManager.wrapWithSandbox(cmd)

    const env = {
        ...process.env,
        SANDBOX_ID: sandboxId,
        PYTHONUNBUFFERED: '1'
    }

    return new Promise((resolve, reject) => {
        const child = spawn(wrapped, {
            cwd: deployment.workDir,
            shell: true,
            env,
            detached: false,
            stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        // Write input
        const input = JSON.stringify(data) + '\n'
        child.stdin!.write(input)
        child.stdin!.end()

        child.stdout!.on('data', (d) => { stdout += d.toString() })
        child.stderr!.on('data', (d) => { stderr += d.toString() })

        child.on('close', async (code) => {
            if (code !== 0) {
                console.error(`[${sandboxId}] Invoke failed with code ${code}. Stderr: ${stderr}`)
                reject(new Error(`Process exited with code ${code}: ${stderr}`))
            } else {
                let uploads: UploadResult[] = []
                
                // Cache new files to local bucket
                const taskBucketDir = path.join(STORAGE_CONFIG.bucketDir, 'invokes', executionId)
                const newFiles = await cacheToLocalBucket(deployment.workDir, taskBucketDir, initialFiles)

                if (newFiles.length > 0) {
                    if (uploadConfig?.fileUploadUrl && uploadConfig?.uploadToken) {
                        // Only upload the new files
                        uploads = await uploadFiles(deployment.workDir, uploadConfig, initialFiles)
                    }
                }
                resolve({ executionId, result: stdout.trim(), uploads })
            }
        })

        child.on('error', (err) => {
            reject(err)
        })
    })
  }

  async patch(sandboxId: string, changes: Array<{ type: string, path: string, url?: string }>, reload: boolean) {
    const deployment = this.deployments.get(sandboxId)
    if (!deployment) throw new Error('Sandbox not found')

    for (const change of changes) {
      const filePath = path.join(deployment.workDir, change.path)
      if (change.type === 'delete') {
        await fsp.rm(filePath, { force: true })
      } else if (change.type === 'add' || change.type === 'modify') {
        if (!change.url) throw new Error(`URL required for ${change.type}`)
        const res = await fetch(change.url)
        if (!res.ok) throw new Error(`Failed to download ${change.url}`)
        const content = await res.arrayBuffer()
        await fsp.mkdir(path.dirname(filePath), { recursive: true })
        await fsp.writeFile(filePath, Buffer.from(content))
      }
    }
    
    // Reload is ignored as there is no persistent process
  }

  listDeployments() {
    return Array.from(this.deployments.values()).map(d => ({
      sandboxId: d.sandboxId,
      entry: d.entry,
      metaUrl: d.metaUrl,
      namespace: d.namespace,
      workDir: d.workDir
    }))
  }

  getDeployment(sandboxId: string) {
    return this.deployments.get(sandboxId)
  }

  async deleteDeployment(sandboxId: string) {
    const deployment = this.deployments.get(sandboxId)
    if (!deployment) throw new Error('Sandbox not found')
    
    try {
        await fsp.rm(deployment.workDir, { recursive: true, force: true })
    } catch (err) {
        console.error(`Failed to cleanup workDir for ${sandboxId}:`, err)
    }

    this.deployments.delete(sandboxId)
  }

  async getFile(executionId: string, filename: string, type: 'invokes' | 'executions' = 'invokes') {
    const filePath = path.join(STORAGE_CONFIG.bucketDir, type, executionId, filename)
    try {
        await fsp.access(filePath)
        return filePath
    } catch {
        throw new Error('File not found')
    }
  }
}

export const deployManager = new DeployManager()
