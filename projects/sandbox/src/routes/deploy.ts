import type { Request, Response } from 'express'
import { deploySchema, patchSchema, invokeSchema } from '../types.js'
import { deployManager } from '../services/deploy-manager.js'

export async function deployHandler(req: Request, res: Response) {
  console.log('[Deploy] Received request to deploy project')
  const parseResult = deploySchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request', details: parseResult.error.format() })
  }

  const { metaUrl, namespace, strategy } = parseResult.data

  try {
    const result = await deployManager.deploy(metaUrl, namespace, strategy)
    res.json({
      status: 'success',
      ...result,
      message: 'Project deployed successfully'
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ status: 'error', message: (err as Error).message })
  }
}

export async function patchHandler(req: Request, res: Response) {
  console.log('[Deploy] Received request to patch sandbox')
  const parseResult = patchSchema.safeParse(req.body)
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid request', details: parseResult.error.format() })
  }

  const { sandboxId, changes, reload } = parseResult.data

  try {
    await deployManager.patch(sandboxId, changes, reload)
    res.json({
      status: 'success',
      restarted: reload,
      message: `Patched ${changes.length} file(s)`
    })
  } catch (err) {
    console.error(err)
    if ((err as Error).message === 'Sandbox not found') {
        return res.status(404).json({ status: 'error', message: 'Sandbox not found' })
    }
    res.status(500).json({ status: 'error', message: (err as Error).message })
  }
}

export async function handleServiceRequest(req: Request, res: Response) {
    const { sandboxId } = req.params
    console.log(`[Deploy] Service request for sandbox ${sandboxId}`)
    
    const parseResult = invokeSchema.safeParse(req.body)
    const data = parseResult.success ? parseResult.data.data : req.body
    const uploadConfig = parseResult.success ? {
        fileUploadUrl: parseResult.data.fileUploadUrl,
        uploadToken: parseResult.data.uploadToken,
        isPublic: parseResult.data.public
    } : undefined

    try {
        const { executionId, result, uploads } = await deployManager.invoke(sandboxId, data, uploadConfig)
        let responseData: any
        try {
            // Try to parse as JSON if possible
            responseData = JSON.parse(result)
        } catch {
            // Otherwise return as string
            responseData = { result }
        }

        // Always include executionId
        if (typeof responseData === 'object' && responseData !== null) {
            responseData.executionId = executionId
            if (uploads.length > 0) {
                responseData.uploads = uploads
            }
            res.json(responseData)
        } else {
            res.json({ executionId, result: responseData, uploads })
        }
    } catch (err) {
        if ((err as Error).message === 'Sandbox not found') {
            return res.status(404).json({ error: 'Sandbox not found' })
        }
        res.status(500).json({ error: (err as Error).message })
    }
}

export async function downloadFileHandler(req: Request, res: Response) {
  const { executionId, filename } = req.params
  console.log(`[Deploy] Download file request: executionId=${executionId}, filename=${filename}`)
  try {
      const filePath = await deployManager.getFile(executionId, filename, 'invokes')
      res.download(filePath)
  } catch (err) {
      res.status(404).json({ error: (err as Error).message })
  }
}
