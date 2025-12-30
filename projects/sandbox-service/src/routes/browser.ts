import { Request, Response } from 'express'
import { BrowserManager } from '../services/browser-manager.js'
import { createSessionSchema, navigateSchema, actionSchema } from '../types.js'

export const createSessionHandler = async (req: Request, res: Response) => {
  try {
    const body = createSessionSchema.parse(req.body)
    const sessionId = await BrowserManager.getInstance().createSession(body)
    res.json({ sessionId })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const destroySessionHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    await BrowserManager.getInstance().destroySession(id)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
}

export const getSessionStateHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const state = await BrowserManager.getInstance().getSessionState(id)
    res.json(state)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const navigateHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const body = navigateSchema.parse(req.body)
    const result = await BrowserManager.getInstance().navigate(id, body.url, body.waitUntil, body.tabId)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const actionHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const body = actionSchema.parse(req.body)
    const result = await BrowserManager.getInstance().performAction(id, body)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getContentHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  const { tabId } = req.query
  try {
    const result = await BrowserManager.getInstance().getContent(id, tabId as string)
    res.setHeader('Content-Type', 'text/html')
    res.send(result.content)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const getTabsHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const tabs = await BrowserManager.getInstance().getTabs(id)
    res.json(tabs)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const createTabHandler = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const result = await BrowserManager.getInstance().createTab(id)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}

export const closeTabHandler = async (req: Request, res: Response) => {
  const { id, tabId } = req.params
  try {
    await BrowserManager.getInstance().closeTab(id, tabId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
