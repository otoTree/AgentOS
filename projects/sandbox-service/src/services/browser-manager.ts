import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { FingerprintGenerator } from 'fingerprint-generator'
import { FingerprintInjector } from 'fingerprint-injector'
import { v4 as uuidv4 } from 'uuid'
import { createHttpProxyServer } from '@anthropic-ai/sandbox-runtime/dist/sandbox/http-proxy.js'
import { sandboxConfig, BROWSER_CONFIG } from '../config.js'

import { ActionRequest } from '../types.js'

type Session = {
  id: string
  context: BrowserContext
  pages: Map<string, Page>
  activePageId: string
  lastActive: number
  queue: Promise<any>
  fingerprint: any
}

export class BrowserManager {
  private static instance: BrowserManager
  private browser: Browser | null = null
  private sessions: Map<string, Session> = new Map()
  private fingerprintGenerator = new FingerprintGenerator()
  private fingerprintInjector = new FingerprintInjector()
  private proxyServer: any = null
  private proxyPort: number = 0

  private constructor() {
    setInterval(() => this.cleanupStaleSessions(), 60 * 1000)
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager()
    }
    return BrowserManager.instance
  }

  private async startProxy() {
    if (this.proxyServer) return;
    
    this.proxyServer = createHttpProxyServer({
        filter: (port: number, host: string) => {
            const { allowedDomains, deniedDomains } = sandboxConfig.network || {};
            
            // Check denied domains first
            if (deniedDomains && deniedDomains.length > 0) {
                if (deniedDomains.some(d => host === d || host.endsWith('.' + d))) return false;
            }
            
            // Check allowed domains if specified
            if (allowedDomains && allowedDomains.length > 0) {
                const isAllowed = allowedDomains.some(d => host === d || host.endsWith('.' + d));
                if (!isAllowed) return false;
            }
            
            return true;
        }
    })
    
    return new Promise<void>((resolve) => {
        this.proxyServer.listen(0, '127.0.0.1', () => {
            this.proxyPort = (this.proxyServer.address() as any).port
            console.log(`Browser Proxy started on port ${this.proxyPort}`)
            resolve()
        })
    })
  }

  private async ensureBrowser() {
    if (!this.browser) {
      await this.startProxy()
      
      console.log('Launching Browser...')
      this.browser = await chromium.launch({
        headless: BROWSER_CONFIG.headless,
        proxy: { server: `http://127.0.0.1:${this.proxyPort}` },
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
      })
    }
  }

  async createSession(options?: { 
    fingerprint?: any,
    storageState?: any
  }) {
    await this.ensureBrowser()
    if (this.sessions.size >= BROWSER_CONFIG.maxSessions) throw new Error('Max sessions limit reached')

    const fingerprint = options?.fingerprint || this.fingerprintGenerator.getFingerprint({
        devices: BROWSER_CONFIG.device === 'mobile' ? ['mobile'] : ['desktop'],
        operatingSystems: ['macos', 'windows', 'linux'],
    })

    const contextOptions: any = {
        viewport: BROWSER_CONFIG.viewport,
        userAgent: fingerprint.fingerprint.navigator.userAgent,
        locale: fingerprint.fingerprint.navigator.language,
    }

    if (options?.storageState) {
        contextOptions.storageState = options.storageState
    }

    const context = await this.browser!.newContext(contextOptions)

    await this.fingerprintInjector.attachFingerprintToPlaywright(context, fingerprint)
    
    // Initial page
    const page = await context.newPage()
    const pageId = uuidv4()
    
    const session: Session = { 
        id: uuidv4(), 
        context, 
        pages: new Map([[pageId, page]]), 
        activePageId: pageId,
        lastActive: Date.now(), 
        queue: Promise.resolve(),
        fingerprint
    }

    // Handle new pages (popups)
    context.on('page', async (newPage) => {
        const newPageId = uuidv4()
        session.pages.set(newPageId, newPage)
        // Ensure we clean up if this page is closed
        newPage.on('close', () => {
            session.pages.delete(newPageId)
            if (session.activePageId === newPageId) {
                const firstId = session.pages.keys().next().value
                if (firstId) session.activePageId = firstId
            }
        })
    })

    // Clean up initial page if closed
    page.on('close', () => {
        session.pages.delete(pageId)
        if (session.activePageId === pageId) {
            const firstId = session.pages.keys().next().value
            if (firstId) session.activePageId = firstId
        }
    })

    this.sessions.set(session.id, session)
    return session.id
  }

  async destroySession(id: string) {
      const session = this.sessions.get(id)
      if (session) {
          await session.context.close().catch(() => {})
          this.sessions.delete(id)
      }
  }

  getSession(id: string) {
      const session = this.sessions.get(id)
      if (session) session.lastActive = Date.now()
      return session
  }


  async getSessionState(id: string) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')
      
      const storageState = await session.context.storageState()
      return {
          fingerprint: session.fingerprint,
          storageState
      }
  }

  private getPage(session: Session, tabId?: string): { page: Page, tabId: string } {
      const targetId = tabId || session.activePageId
      const page = session.pages.get(targetId)
      if (!page) throw new Error('Tab/Page not found')
      
      // Update active page if explicitly switched
      if (tabId) session.activePageId = tabId
      
      return { page, tabId: targetId }
  }

  private cleanupStaleSessions() {
      const now = Date.now()
      for (const [id, session] of this.sessions.entries()) {
          if (now - session.lastActive > BROWSER_CONFIG.sessionTimeout) {
              console.log(`Cleaning up stale session ${id}`)
              this.destroySession(id)
          }
      }
  }

  async getTabs(id: string) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')
      
      const tabs = []
      for (const [tabId, page] of session.pages.entries()) {
          let title = ''
          try { title = await page.title() } catch {}
          tabs.push({
              id: tabId,
              url: page.url(),
              title,
              active: tabId === session.activePageId
          })
      }
      return tabs
  }

  async createTab(id: string) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')
      
      return this.enqueue(session, async () => {
          const page = await session.context.newPage()
          
          // Find the ID assigned by the context 'page' event listener
          let tabId: string | undefined
          for (const [tid, p] of session.pages.entries()) {
              if (p === page) {
                  tabId = tid
                  break
              }
          }

          // Fallback if listener didn't catch it (unlikely)
          if (!tabId) {
              tabId = uuidv4()
              session.pages.set(tabId, page)
              page.on('close', () => {
                  session.pages.delete(tabId!)
                  if (session.activePageId === tabId) {
                      const firstId = session.pages.keys().next().value
                      if (firstId) session.activePageId = firstId
                  }
              })
          }

          session.activePageId = tabId
          return { tabId }
      })
  }

  async closeTab(id: string, tabId: string) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')
      
      return this.enqueue(session, async () => {
          const page = session.pages.get(tabId)
          if (!page) throw new Error('Tab not found')
          
          await page.close()
          // Event listener will handle map deletion and active switching
          
          return { success: true }
      })
  }

  async navigate(id: string, url: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit', tabId?: string) {
    const session = this.getSession(id)
    if (!session) throw new Error('Session not found')
    
    return this.enqueue(session, async () => {
        const { page, tabId: currentTabId } = this.getPage(session, tabId)
        await page.goto(url, { waitUntil })
        const buffer = await page.screenshot()
        const screenshot = buffer.toString('base64')
        return { url: page.url(), screenshot, tabId: currentTabId }
    })
  }

  async getContent(id: string, tabId?: string) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')
      
      return this.enqueue(session, async () => {
          const { page, tabId: currentTabId } = this.getPage(session, tabId)
          const content = await page.content()
          return { content, tabId: currentTabId }
      })
  }

  async performAction(id: string, options: ActionRequest) {
      const session = this.getSession(id)
      if (!session) throw new Error('Session not found')

      const { action, selector, value, script, x, y, endX, endY, tabId, duration, steps } = options

      return this.enqueue(session, async () => {
          const { page, tabId: currentTabId } = this.getPage(session, tabId)
          let result = null

          if (selector && !['hover', 'drag', 'scroll'].includes(action)) {
              try {
                  await page.waitForSelector(selector, { timeout: 5000 })
              } catch (e) {
                  // ignore timeout
              }
          }

          switch (action) {
              case 'click':
                  if (x !== undefined && y !== undefined) {
                      await page.mouse.click(x, y, { delay: duration })
                  } else if (selector) {
                      const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {})
                      await page.click(selector, { delay: duration })
                      await navPromise
                  } else {
                      throw new Error('Selector or coordinates (x, y) required for click')
                  }
                  break
              case 'fill':
                  if (!selector || value === undefined) throw new Error('Selector and value required for fill')
                  await page.fill(selector, value)
                  break
              case 'type':
                  if (value === undefined) throw new Error('Value required for type')
                  if (selector) {
                      await page.type(selector, value, { delay: duration })
                  } else {
                      await page.keyboard.type(value, { delay: duration })
                  }
                  break
              case 'screenshot':
                  // just screenshot
                  break
              case 'evaluate':
                  if (!script) throw new Error('Script required for evaluate')
                  result = await page.evaluate(script)
                  break
              case 'press':
                   if (!value) throw new Error('Key (value) required for press')
                   if (selector) {
                       if (value === 'Enter') {
                           const navPromise = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {})
                           await page.press(selector, value, { delay: duration })
                           await navPromise
                       } else {
                           await page.press(selector, value, { delay: duration })
                       }
                   } else {
                       await page.keyboard.press(value, { delay: duration })
                   }
                   break
              case 'scroll':
                  if (selector) {
                      await page.locator(selector).scrollIntoViewIfNeeded()
                  } else if (x !== undefined && y !== undefined) {
                      await page.mouse.wheel(x, y)
                  } else {
                      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
                  }
                  break
              case 'hover':
                  if (!selector) throw new Error('Selector required for hover')
                  await page.hover(selector)
                  break
              case 'drag':
                  if (selector && value) {
                      await page.dragAndDrop(selector, value)
                  } else if (x !== undefined && y !== undefined && endX !== undefined && endY !== undefined) {
                      await page.mouse.move(x, y)
                      await page.mouse.down()
                      await page.mouse.move(endX, endY, { steps: steps || 20 })
                      await page.mouse.up()
                  } else {
                      throw new Error('Selector+Value or Start(x,y)+End(x,y) required for drag')
                  }
                  break
              case 'mouse_move':
                  if (x !== undefined && y !== undefined) {
                      await page.mouse.move(x, y, { steps: steps || 5 })
                  } else {
                      throw new Error('Coordinates (x, y) required for mouse_move')
                  }
                  break
              case 'mouse_down':
                  await page.mouse.down()
                  break
              case 'mouse_up':
                  await page.mouse.up()
                  break
              default:
                  throw new Error(`Unknown action: ${action}`)
          }
          
          try {
              // Wait for network to settle (catch redirects or SPA updates)
              await page.waitForLoadState('networkidle', { timeout: 2000 })
          } catch (e) {
              // If network is busy, at least ensure DOM is ready
              try { await page.waitForLoadState('domcontentloaded', { timeout: 2000 }) } catch {}
          }
          
          const buffer = await page.screenshot()
          const screenshot = buffer.toString('base64')
          return { result, screenshot, url: page.url(), tabId: currentTabId }
      })
  }

  private enqueue<T>(session: Session, task: () => Promise<T>): Promise<T> {
      const next = session.queue.then(() => task()).catch(err => {
          throw err
      })
      session.queue = next.catch(() => {}) // suppress error for next task
      return next
  }
}
