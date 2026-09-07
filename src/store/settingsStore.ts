import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sanitizePersistedSettings, type CanvasInstance, type Theme } from './settingsValidation'

export type { CanvasInstance } from './settingsValidation'

const STORAGE_KEY = 'school-checklist-settings'

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      canvasInstances: [],
      theme: 'dark',
      timeframeDays: 7,
      soundEnabled: true,
      confettiEnabled: true,
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
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedSettings(persistedState),
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Failed to restore saved settings:', error)
          }
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
