import type { Request, Response } from 'express'
import { spawn, spawnSync } from 'child_process'
import { promises as fsp } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { sandboxConfig, STORAGE_CONFIG } from '../config.js'
import { executeSchema } from '../types.js'
import { uploadFiles, cacheToLocalBucket } from '../utils/file-utils.js'
import { v4 as uuidv4 } from 'uuid'

let sandboxAvailable: boolean | null = null
let sandboxUnavailableReason: string | null = null

async function ensureSandboxAvailability(): Promise<boolean> {
  if (sandboxAvailable !== null) return sandboxAvailable
  try {
    // Initialize once if not already
    if (!SandboxManager.isSandboxingEnabled()) {
      await SandboxManager.initialize(sandboxConfig)
    }
    const testWrapped = await SandboxManager.wrapWithSandbox('true')
    const result = spawnSync(testWrapped, { shell: true, encoding: 'utf8', timeout: 3000 })
    sandboxAvailable = result.status === 0
    if (!sandboxAvailable) {
      sandboxUnavailableReason = (result.stderr || result.stdout || 'unknown error').toString()
    }
  } catch (err) {
    sandboxAvailable = false
    sandboxUnavailableReason = (err as Error).message
  }
  return sandboxAvailable
}

export async function executeHandler(req: Request, res: Response) {
  //console.log(req.hostname)
  
  const parseResult = executeSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request', details: parseResult.error.format() })
  }
  // Support both camelCase and snake_case input keys
  const { code, timeoutMs } = parseResult.data
  const uploadToken = parseResult.data.uploadToken ?? (req.body?.api_token as string | undefined)
  const fileUploadUrl = parseResult.data.fileUploadUrl ?? (req.body?.file_upload_url as string | undefined)
  const isPublic = parseResult.data.public ?? ((req.body?.public as unknown) === true || (req.body?.public as unknown) === 'true')
  //console.log('fileUploadUrl', fileUploadUrl)

  try {
    await SandboxManager.initialize(sandboxConfig)

    const executionId = uuidv4()
    // Create per-execution working directory under system tmp
    const tmpPrefix = path.join(os.tmpdir(), 'py-exec-')
    const workDir = await fsp.mkdtemp(tmpPrefix)

    const label = 'PY' + Math.random().toString(36).slice(2)
    const venvPython = path.join(process.cwd(), process.env.PYTHON_VENV || 'python-venv/bin/python')
    const pythonCmd = `${venvPython} - <<'${label}'\n${code}\n${label}`
    const useSandbox = await ensureSandboxAvailability()
    const wrapped = useSandbox ? await SandboxManager.wrapWithSandbox(pythonCmd) : pythonCmd

    // Run in the per-execution working directory
    const child = spawn(wrapped, { shell: true, cwd: workDir })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })

    const killTimer = timeoutMs
      ? setTimeout(() => { child.kill('SIGKILL') }, timeoutMs)
      : null

    child.on('close', async (code, signal) => {
      if (killTimer) clearTimeout(killTimer)
      let annotatedStderr = SandboxManager.annotateStderrWithSandboxFailures(pythonCmd, stderr)
      if (!useSandbox) {
        const note = `\n[Note] Sandbox disabled due to environment limitations${sandboxUnavailableReason ? `: ${sandboxUnavailableReason.trim()}` : ''}`
        annotatedStderr = annotatedStderr ? annotatedStderr + note : note
      }

      // 1. Cache files to local bucket for this execution
      const executionBucketDir = path.join(STORAGE_CONFIG.bucketDir, 'executions', executionId)
      await cacheToLocalBucket(workDir, executionBucketDir)

      // 2. Optionally collect and upload generated files
      let uploads: any[] = []
      if (fileUploadUrl && uploadToken) {
        uploads = await uploadFiles(workDir, { fileUploadUrl, uploadToken, isPublic })
      }

      // Cleanup working directory recursively
      try {
        await fsp.rm(workDir, { recursive: true, force: true })
      } catch { /* ignore cleanup errors */ }

      res.status(200).json({ executionId, exitCode: code, signal, stdout, stderr: annotatedStderr, uploads })
    })
  } catch (err) {
    res.status(500).json({ error: 'Execution failed', message: (err as Error).message })
  }
}

export async function downloadExecuteFileHandler(req: Request, res: Response) {
  const { executionId, filename } = req.params
  const filePath = path.join(STORAGE_CONFIG.bucketDir, 'executions', executionId, filename)
  try {
    await fsp.access(filePath)
    res.download(filePath)
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
}
