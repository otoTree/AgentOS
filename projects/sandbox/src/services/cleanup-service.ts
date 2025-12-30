import { promises as fsp } from 'fs'
import path from 'path'
import { STORAGE_CONFIG } from '../config'

export class CleanupService {
  private interval: NodeJS.Timeout | null = null

  async start() {
    if (this.interval) return

    console.log(`[CleanupService] Starting cleanup service. Interval: ${STORAGE_CONFIG.cleanupIntervalMs}ms, Retention: ${STORAGE_CONFIG.retentionMs}ms`)
    
    this.interval = setInterval(async () => {
      try {
        await this.cleanup()
      } catch (err) {
        console.error('[CleanupService] Error during cleanup:', err)
      }
    }, STORAGE_CONFIG.cleanupIntervalMs)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  private async cleanup() {
    const bucketDir = STORAGE_CONFIG.bucketDir
    const now = Date.now()
    const retentionMs = STORAGE_CONFIG.retentionMs

    try {
      // Ensure directory exists
      await fsp.mkdir(bucketDir, { recursive: true })

      // Clean executions and invokes directories
      await this.cleanupSubDir(path.join(bucketDir, 'executions'), now, retentionMs)
      await this.cleanupSubDir(path.join(bucketDir, 'invokes'), now, retentionMs)

    } catch (err) {
      console.error('[CleanupService] Failed to read bucket directory:', err)
    }
  }

  private async cleanupSubDir(subDir: string, now: number, retentionMs: number) {
    try {
      const exists = await fsp.access(subDir).then(() => true).catch(() => false)
      if (!exists) return

      const entries = await fsp.readdir(subDir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(subDir, entry.name)
          const stats = await fsp.stat(dirPath)
          
          if (now - stats.mtimeMs > retentionMs) {
            console.log(`[CleanupService] Deleting expired directory: ${dirPath}`)
            await fsp.rm(dirPath, { recursive: true, force: true })
          }
        }
      }
    } catch (err) {
      console.error(`[CleanupService] Error cleaning subdirectory ${subDir}:`, err)
    }
  }
}

export const cleanupService = new CleanupService()
