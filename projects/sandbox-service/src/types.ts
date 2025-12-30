import { z } from 'zod'

export const executeSchema = z.object({
  code: z.string().min(1, 'code is required'),
  timeoutMs: z.number().int().min(1).max(120000).optional(),
  // Optional upload configuration: when provided, the service will
  // collect files generated in the execution working directory and
  // upload them to the specified file service.
  fileUploadUrl: z.string().url().optional(),
  uploadToken: z.string().min(1).optional(),
  public: z.boolean().optional(),
})

export type ExecuteRequest = z.infer<typeof executeSchema>

export const createSessionSchema = z.object({
  fingerprint: z.any().optional(),
  storageState: z.any().optional()
})

export const navigateSchema = z.object({
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional(),
  tabId: z.string().optional()
})

export const actionSchema = z.object({
  action: z.enum(['click', 'fill', 'screenshot', 'evaluate', 'press', 'type', 'scroll', 'hover', 'drag', 'mouse_move', 'mouse_down', 'mouse_up']),
  selector: z.string().optional(),
  // Coordinates for click/scroll actions
  x: z.number().optional(),
  y: z.number().optional(),
  // Target coordinates for drag/move
  endX: z.number().optional(),
  endY: z.number().optional(),
  value: z.string().optional(), // for fill/type
  script: z.string().optional(), // for evaluate
  tabId: z.string().optional(),
  // Options for fine-tuning interactions
  duration: z.number().optional(), // delay in ms
  steps: z.number().optional(), // steps for mouse movement
})

export type CreateSessionRequest = z.infer<typeof createSessionSchema>
export type NavigateRequest = z.infer<typeof navigateSchema>
export type ActionRequest = z.infer<typeof actionSchema>

export const packageSchema = z.object({
  action: z.enum(['install', 'uninstall']),
  packages: z.array(z.string().min(1)).min(1)
})
