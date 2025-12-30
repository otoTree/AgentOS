import type { Request, Response, NextFunction } from 'express'
import { AUTH_TOKEN } from '../config.js'

export function bearerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization']
  console.log(AUTH_TOKEN)
  if (!AUTH_TOKEN) {
    return res.status(500).json({ error: 'AUTH_TOKEN not configured' })
  }
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' })
  }
  const token = header.slice('Bearer '.length)
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' })
  }
  next()
}