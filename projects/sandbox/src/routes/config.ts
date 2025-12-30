
import type { Request, Response } from 'express'
import { z } from 'zod'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { sandboxConfig, updateAllowedDomains } from '../config.js'

const updateAllowedDomainsSchema = z.object({
  domains: z.array(z.string()).min(0)
})

export async function updateAllowedDomainsHandler(req: Request, res: Response) {
  const parseResult = updateAllowedDomainsSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request', details: parseResult.error.format() })
  }

  const { domains } = parseResult.data

  try {
    // 1. Update the configuration object
    updateAllowedDomains(domains)

    // 2. Reset the SandboxManager to stop existing proxies
    await SandboxManager.reset()

    // 3. Re-initialize SandboxManager with the new configuration
    await SandboxManager.initialize(sandboxConfig)

    res.json({ 
      message: 'Sandbox allowed domains updated successfully', 
      allowedDomains: sandboxConfig.network.allowedDomains 
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update sandbox configuration', message: (err as Error).message })
  }
}

export async function getConfigHandler(req: Request, res: Response) {
    res.json({
        network: sandboxConfig.network,
        filesystem: sandboxConfig.filesystem
    })
}
