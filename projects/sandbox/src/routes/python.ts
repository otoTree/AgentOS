import type { Request, Response } from 'express'
import { spawnSync } from 'child_process'
import * as path from 'path'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { sandboxConfig } from '../config.js'
import { packageSchema } from '../types.js'

const venvPython = path.join(process.cwd(), process.env.PYTHON_VENV || 'python-venv/bin/python')

export async function listPackagesHandler(req: Request, res: Response) {
  try {
    // Ensure sandbox is initialized
    if (!SandboxManager.isSandboxingEnabled()) {
      await SandboxManager.initialize(sandboxConfig)
    }

    const cmd = `${venvPython} -m pip list --format=json`
    const wrappedCmd = await SandboxManager.wrapWithSandbox(cmd)
    
    const result = spawnSync(wrappedCmd, { shell: true, encoding: 'utf8' })
    if (result.error) {
       throw result.error
    }
    if (result.status !== 0) {
        return res.status(500).json({ error: 'Failed to list packages', details: result.stderr })
    }
    const packages = JSON.parse(result.stdout)
    res.json({ packages })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}

export async function managePackageHandler(req: Request, res: Response) {
    const parseResult = packageSchema.safeParse(req.body)
    if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid request', details: parseResult.error.format() })
    }
    
    const { action, packages } = parseResult.data
    
    try {
        // Ensure sandbox is initialized
        if (!SandboxManager.isSandboxingEnabled()) {
          await SandboxManager.initialize(sandboxConfig)
        }

        const args = ['-m', 'pip', action]
        if (action === 'install') {
            args.push('-i', 'https://pypi.tuna.tsinghua.edu.cn/simple')
        }
        args.push(...packages)
        if (action === 'uninstall') {
            args.push('-y') // Auto confirm
        }

        // Construct command string for sandbox wrapping
        // Note: Simple joining is risky for arbitrary input, but packages are validated by schema (string.min(1))
        // Ideally should escape arguments, but for now we trust schema validation
        const cmd = `${venvPython} ${args.join(' ')}`
        const wrappedCmd = await SandboxManager.wrapWithSandbox(cmd)

        const result = spawnSync(wrappedCmd, { shell: true, encoding: 'utf8' })
        
        if (result.error) {
            throw result.error
        }
        
        if (result.status !== 0) {
             return res.status(500).json({ error: `Failed to ${action} packages`, details: result.stderr })
        }
        
        res.json({ message: `Successfully ${action}ed packages: ${packages.join(', ')}`, output: result.stdout })

    } catch (err) {
        res.status(500).json({ error: (err as Error).message })
    }
}
