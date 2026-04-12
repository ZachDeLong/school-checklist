import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CanvasInstance {
  id: string
  name: string
  url: string
  token: string
}

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'school-checklist-settings'

function getStoredSettings(): { theme: Theme; timeframeDays: number; canvasInstances: CanvasInstance[]; soundEnabled: boolean; confettiEnabled: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        theme: parsed.state?.theme || 'dark',
        timeframeDays: parsed.state?.timeframeDays || 7,
        canvasInstances: parsed.state?.canvasInstances || [],
        soundEnabled: parsed.state?.soundEnabled ?? true,
        confettiEnabled: parsed.state?.confettiEnabled ?? true,
      }
    }
  } catch { /* ignore invalid stored settings */ }
  return { theme: 'dark', timeframeDays: 7, canvasInstances: [], soundEnabled: true, confettiEnabled: true }
}

const stored = getStoredSettings()

interface SettingsState {
  canvasInstances: CanvasInstance[]
  theme: Theme
  timeframeDays: number
  soundEnabled: boolean
  confettiEnabled: boolean
  setupPromptDismissed: boolean
  minimalMode: boolean
  addCanvasInstance: (name: string, url: string, token: string) => void
  updateCanvasInstance: (id: string, updates: Partial<Omit<CanvasInstance, 'id'>>) => void
  removeCanvasInstance: (id: string) => void
  setTheme: (theme: Theme) => void
  setTimeframeDays: (days: number) => void
  setSoundEnabled: (enabled: boolean) => void
  setConfettiEnabled: (enabled: boolean) => void
  setSetupPromptDismissed: (dismissed: boolean) => void
  setMinimalMode: (minimal: boolean) => void
  isConfigured: () => boolean
  // Legacy getters for backwards compatibility
  canvasToken: string
  canvasUrl: string
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      canvasInstances: stored.canvasInstances,
      theme: stored.theme,
      timeframeDays: stored.timeframeDays,
      soundEnabled: stored.soundEnabled,
      confettiEnabled: stored.confettiEnabled,
      setupPromptDismissed: false,
      minimalMode: false,

      addCanvasInstance: (name, url, token) => {
        const instance: CanvasInstance = {
          id: crypto.randomUUID(),
          name: name.trim(),
          url: normalizeCanvasUrl(url),
          token: token.trim(),
        }
        set((state) => ({
          canvasInstances: [...state.canvasInstances, instance],
        }))
      },

      updateCanvasInstance: (id, updates) => {
        set((state) => ({
          canvasInstances: state.canvasInstances.map((instance) =>
            instance.id === id
              ? {
                  ...instance,
                  ...updates,
                  url: updates.url ? normalizeCanvasUrl(updates.url) : instance.url,
                  token: updates.token ? updates.token.trim() : instance.token,
                  name: updates.name ? updates.name.trim() : instance.name,
                }
              : instance
          ),
        }))
      },

      removeCanvasInstance: (id) => {
        set((state) => ({
          canvasInstances: state.canvasInstances.filter((instance) => instance.id !== id),
        }))
      },

      setTheme: (theme) => set({ theme }),
      setTimeframeDays: (days) => set({ timeframeDays: days }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setConfettiEnabled: (enabled) => set({ confettiEnabled: enabled }),
      setSetupPromptDismissed: (dismissed) => set({ setupPromptDismissed: dismissed }),
      setMinimalMode: (minimal) => set({ minimalMode: minimal }),

      isConfigured: () => {
        const { canvasInstances } = get()
        return canvasInstances.length > 0 && canvasInstances.some(i => i.url && i.token)
      },

      // Legacy getters - return first instance for backwards compatibility
      get canvasToken() {
        const { canvasInstances } = get()
        return canvasInstances[0]?.token || ''
      },
      get canvasUrl() {
        const { canvasInstances } = get()
        return canvasInstances[0]?.url || ''
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        canvasInstances: state.canvasInstances,
        theme: state.theme,
        timeframeDays: state.timeframeDays,
        soundEnabled: state.soundEnabled,
        confettiEnabled: state.confettiEnabled,
        setupPromptDismissed: state.setupPromptDismissed,
        minimalMode: state.minimalMode,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.theme) {
            document.documentElement.setAttribute('data-theme', state.theme)
          }
        }
      },
    }
  )
)

// Keep data-theme attribute in sync outside of React's render cycle
useSettingsStore.subscribe((state) => {
  document.documentElement.setAttribute('data-theme', state.theme)
})

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
