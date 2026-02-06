import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CanvasInstance {
  id: string
  name: string
  url: string
  token: string
}

type Theme = 'light' | 'dark'

interface SettingsState {
  canvasInstances: CanvasInstance[]
  theme: Theme
  timeframeDays: number
  addCanvasInstance: (name: string, url: string, token: string) => void
  updateCanvasInstance: (id: string, updates: Partial<Omit<CanvasInstance, 'id'>>) => void
  removeCanvasInstance: (id: string) => void
  setTheme: (theme: Theme) => void
  setTimeframeDays: (days: number) => void
  isConfigured: () => boolean
  // Legacy getters for backwards compatibility
  canvasToken: string
  canvasUrl: string
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      canvasInstances: [],
      theme: 'dark' as Theme,
      timeframeDays: 7,

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
      name: 'school-checklist-settings',
      partialize: (state) => ({
        canvasInstances: state.canvasInstances,
        theme: state.theme,
        timeframeDays: state.timeframeDays,
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
