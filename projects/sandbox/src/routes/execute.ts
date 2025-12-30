import type { Request, Response } from 'express'
import { spawn, spawnSync } from 'child_process'
import { promises as fsp } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { sandboxConfig } from '../config.js'
import { executeSchema } from '../types.js'
import mime from 'mime-types'
import { fetch, FormData, File } from 'undici'

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
      // Optionally collect and upload generated files
      const uploads: Array<{ filename: string, url?: string, status: number, error?: string }> = []
      if (fileUploadUrl && uploadToken) {
        try {
          async function walk(dir: string): Promise<string[]> {
            const out: string[] = []
            const entries = await fsp.readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
              const full = path.join(dir, entry.name)
              if (entry.isDirectory()) {
                out.push(...(await walk(full)))
              } else if (entry.isFile()) {
                out.push(full)
              }
            }
            return out
          }
          const filepaths = await walk(workDir)
          for (const filepath of filepaths) {
            const filename = path.relative(workDir, filepath)
            const form = new FormData()
            // Read into buffer and attach as File with MIME type
            const buf = await fsp.readFile(filepath)
            const mimeType = mime.lookup(filename) || 'application/octet-stream'
            const file = new File([buf], filename, { type: String(mimeType) })
            form.append('file', file)
            // Optional query param for public flag
            const url = new URL(fileUploadUrl)
            if (isPublic !== undefined) {
              url.searchParams.set('public', isPublic ? 'true' : 'false')
            }
            console.log('uploading', filename, url.toString())
            const resp = await fetch(url, {
              method: 'POST',
              body: form,
              headers: {
                Authorization: `Bearer ${uploadToken}`,
              },
            })
            let uploadedUrl: string | undefined
            try {
              const json = await resp.json()
              uploadedUrl = (json as any)?.url || (json as any)?.data?.url || (json as any)?.file?.url
            } catch {
              // ignore JSON parse errors; service may return non-JSON
            }
            uploads.push({ filename, url: uploadedUrl, status: resp.status })
          }
        } catch (e) {
          uploads.push({ filename: '', status: 0, error: (e as Error).message })
        }
      }

      // Cleanup working directory recursively
      try {
        await fsp.rm(workDir, { recursive: true, force: true })
      } catch { /* ignore cleanup errors */ }

      res.status(200).json({ exitCode: code, signal, stdout, stderr: annotatedStderr, uploads })
    })
  } catch (err) {
    res.status(500).json({ error: 'Execution failed', message: (err as Error).message })
  }
}
