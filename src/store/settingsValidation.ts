import { z } from 'zod'

export interface CanvasInstance {
  id: string
  name: string
  url: string
  token: string
}

export type Theme = 'light' | 'dark'

export interface PersistedSettings {
  canvasInstances: CanvasInstance[]
  theme: Theme
  timeframeDays: number
  soundEnabled: boolean
  confettiEnabled: boolean
  setupPromptDismissed: boolean
  minimalMode: boolean
}

const CanvasInstanceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  url: z.string(),
  token: z.string(),
})

const ThemeSchema = z.enum(['light', 'dark'])
const TimeframeSchema = z.number().int().min(1).max(120)
const BooleanSchema = z.boolean()

/** Keeps valid persisted fields while rejecting values that could break the UI. */
export function sanitizePersistedSettings(value: unknown): Partial<PersistedSettings> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const raw = value as Record<string, unknown>
  const sanitized: Partial<PersistedSettings> = {}

  const theme = ThemeSchema.safeParse(raw.theme)
  if (theme.success) sanitized.theme = theme.data

  const timeframeDays = TimeframeSchema.safeParse(raw.timeframeDays)
  if (timeframeDays.success) sanitized.timeframeDays = timeframeDays.data

  for (const key of ['soundEnabled', 'confettiEnabled', 'setupPromptDismissed', 'minimalMode'] as const) {
    const parsed = BooleanSchema.safeParse(raw[key])
    if (parsed.success) sanitized[key] = parsed.data
  }

  if (Array.isArray(raw.canvasInstances)) {
    const seenIds = new Set<string>()
    sanitized.canvasInstances = raw.canvasInstances.flatMap((candidate) => {
      const parsed = CanvasInstanceSchema.safeParse(candidate)
      if (!parsed.success || seenIds.has(parsed.data.id)) return []
      seenIds.add(parsed.data.id)
      return [parsed.data]
    })
  }

  return sanitized
}
