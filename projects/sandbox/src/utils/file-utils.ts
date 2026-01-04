import { promises as fsp } from 'fs'
import * as path from 'path'
import { fetch, FormData, File } from 'undici'
import mime from 'mime-types'

export type UploadConfig = {
  fileUploadUrl?: string
  uploadToken?: string
  isPublic?: boolean
}

export type UploadResult = {
  filename: string
  url?: string
  status: number
  error?: string
}

/**
 * Recursively walks a directory and returns all file paths.
 */
export async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        out.push(...(await walk(full)))
      } else if (entry.isFile()) {
        out.push(full)
      }
    }
  } catch (e) {
    console.error(`Error walking directory ${dir}:`, e)
  }
  return out
}

/**
 * Caches files from workDir to a local bucket directory.
 */
export async function cacheToLocalBucket(
  workDir: string,
  targetBucketDir: string,
  excludeFiles: string[] = []
): Promise<string[]> {
  const currentFiles = await walk(workDir)
  const excludeSet = new Set(excludeFiles.map(f => path.resolve(f)))
  const cachedFiles: string[] = []

  if (currentFiles.length === 0) return []

  await fsp.mkdir(targetBucketDir, { recursive: true })

  for (const filePath of currentFiles) {
    if (excludeSet.has(path.resolve(filePath))) continue

    const relPath = path.relative(workDir, filePath)
    const destPath = path.join(targetBucketDir, relPath)
    
    await fsp.mkdir(path.dirname(destPath), { recursive: true })
    await fsp.copyFile(filePath, destPath)
    cachedFiles.push(relPath)
  }

  return cachedFiles
}

/**
 * Uploads files to a remote service.
 */
export async function uploadFiles(
  workDir: string,
  config: UploadConfig,
  excludeFiles: string[] = []
): Promise<UploadResult[]> {
  const { fileUploadUrl, uploadToken, isPublic } = config
  if (!fileUploadUrl || !uploadToken) return []

  const uploads: UploadResult[] = []
  try {
    const filepaths = await walk(workDir)
    const excludeSet = new Set(excludeFiles.map(f => path.resolve(f)))

    for (const filepath of filepaths) {
      if (excludeSet.has(path.resolve(filepath))) continue

      const filename = path.relative(workDir, filepath)
      const form = new FormData()
      
      const buf = await fsp.readFile(filepath)
      const mimeType = mime.lookup(filename) || 'application/octet-stream'
      const file = new File([buf], filename, { type: String(mimeType) })
      form.append('file', file)
      
      const url = new URL(fileUploadUrl)
      if (isPublic !== undefined) {
        url.searchParams.set('public', isPublic ? 'true' : 'false')
      }

      try {
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
        } catch { }
        uploads.push({ filename, url: uploadedUrl, status: resp.status })
      } catch (e) {
        uploads.push({ filename, status: 0, error: (e as Error).message })
      }
    }
  } catch (e) {
    uploads.push({ filename: '', status: 0, error: (e as Error).message })
  }
  return uploads
}
