import express from 'express'
import 'dotenv/config'
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
import { PORT, sandboxConfig } from './config.js'
import { executeHandler, downloadExecuteFileHandler } from './routes/execute.js'
import { healthHandler } from './routes/health.js'
import { listPackagesHandler, managePackageHandler } from './routes/python.js'
import { createSessionHandler, destroySessionHandler, navigateHandler, actionHandler, getTabsHandler, createTabHandler, closeTabHandler, getContentHandler, getSessionStateHandler } from './routes/browser.js'
import { updateAllowedDomainsHandler, getConfigHandler } from './routes/config.js'
import { deployHandler, patchHandler, handleServiceRequest, downloadFileHandler } from './routes/deploy.js'
import { bearerAuth } from './middleware/auth.js'
import { cleanupService } from './services/cleanup-service.js'

// --- Initialize app ---
const app = express()
app.use(express.json({ limit: '256kb' }))
app.use(bearerAuth)

// --- Routes ---
app.post('/execute', executeHandler)
app.get('/executions/:executionId/files/:filename', downloadExecuteFileHandler)
app.post('/deploy', deployHandler)
app.post('/update', patchHandler)
app.all('/services/:sandboxId', handleServiceRequest)
app.get('/invokes/:executionId/files/:filename', downloadFileHandler)
app.get('/health', healthHandler)

// Configuration Routes
app.get('/config', getConfigHandler)
app.post('/config/allowed-domains', updateAllowedDomainsHandler)

// Python Package Routes
app.get('/python/packages', listPackagesHandler)
app.post('/python/packages', managePackageHandler)

// Browser Routes
app.post('/browser/sessions', createSessionHandler)
app.delete('/browser/sessions/:id', destroySessionHandler)
app.post('/browser/sessions/:id/navigate', navigateHandler)
app.post('/browser/sessions/:id/action', actionHandler)
app.get('/browser/sessions/:id/content', getContentHandler)
app.get('/browser/sessions/:id/state', getSessionStateHandler)
app.get('/browser/sessions/:id/tabs', getTabsHandler)
app.post('/browser/sessions/:id/tabs', createTabHandler)
app.delete('/browser/sessions/:id/tabs/:tabId', closeTabHandler)

// Start server
app.listen(PORT, async () => {
  try {
    await SandboxManager.initialize(sandboxConfig)
    await cleanupService.start()
  } catch {
    // ignore init failure here; route will reattempt
  }
  console.log(`python-sandbox-service listening on :${PORT}`)
})