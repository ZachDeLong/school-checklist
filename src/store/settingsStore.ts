import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  canvasToken: string
  canvasUrl: string
  setCanvasToken: (token: string) => void
  setCanvasUrl: (url: string) => void
  isConfigured: () => boolean
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      canvasToken: '',
      canvasUrl: '',
      setCanvasToken: (token) => set({ canvasToken: token.trim() }),
      setCanvasUrl: (url) => set({ canvasUrl: normalizeCanvasUrl(url) }),
      isConfigured: () => {
        const { canvasToken, canvasUrl } = get()
        return canvasToken.length > 0 && canvasUrl.length > 0
      },
    }),
    {
      name: 'school-checklist-settings',
    }
  )
)

function normalizeCanvasUrl(url: string): string {
  let normalized = url.trim().toLowerCase()
  // Remove protocol if present
  normalized = normalized.replace(/^https?:\/\//, '')
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '')
  // If they just entered a subdomain, append .instructure.com
  if (!normalized.includes('.')) {
    normalized = `${normalized}.instructure.com`
  }
  return normalized
}
