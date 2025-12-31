import type { Request, Response } from 'express'

export function healthHandler(_req: Request, res: Response) {
  // console.log('[Health] Health check') // Optional: uncomment if needed, but global logger covers it
  res.json({ ok: true })
}