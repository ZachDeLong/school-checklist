import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAssignments, type CanvasAssignment } from '../lib/canvas'

export interface Task {
  id: string
  title: string
  dueDate: string | null
  courseName: string
  source: 'canvas' | 'manual'
  completed: boolean
}

interface TaskStore {
  tasks: Task[]
  lastFetched: number | null
  syncing: boolean
  error: string | null

  syncCanvas: (force?: boolean) => Promise<void>
  toggleComplete: (id: string) => void
  addManualTask: (title: string, dueDate: string | null, courseName?: string) => void
}

const STALE_THRESHOLD = 60 * 60 * 1000 // 1 hour

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      lastFetched: null,
      syncing: false,
      error: null,

      syncCanvas: async (force = false) => {
        const { lastFetched, syncing } = get()

        // Prevent concurrent syncs or syncing if data is fresh
        if (syncing) return
        if (!force && lastFetched && Date.now() - lastFetched < STALE_THRESHOLD) return

        set({ syncing: true, error: null })

        try {
          const assignments = await fetchAssignments()
          const canvasTasks = assignments.map(transformToTask)

          // Dedupe canvas tasks by ID
          const seenIds = new Set<string>()
          const uniqueCanvasTasks = canvasTasks.filter(t => {
            if (seenIds.has(t.id)) return false
            seenIds.add(t.id)
            return true
          })

          // Merge: keep manual tasks + completion state, update canvas tasks
          const { tasks: existingTasks } = get()
          const manualTasks = existingTasks.filter(t => t.source === 'manual')

          // Check completion by assignment name (more stable than ID)
          const completedNames = new Set(
            existingTasks.filter(t => t.completed).map(t => t.title)
          )

          const mergedCanvasTasks = uniqueCanvasTasks.map(t => ({
            ...t,
            completed: completedNames.has(t.title)
          }))

          set({
            tasks: [...mergedCanvasTasks, ...manualTasks],
            lastFetched: Date.now(),
            syncing: false,
          })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Sync failed',
            syncing: false
          })
        }
      },

      toggleComplete: (id) => set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { ...t, completed: !t.completed } : t
        )
      })),

      addManualTask: (title, dueDate, courseName = 'Personal') => set((state) => ({
        tasks: [...state.tasks, {
          id: `manual-${Date.now()}`,
          title,
          dueDate,
          courseName,
          source: 'manual' as const,
          completed: false,
        }]
      })),
    }),
    { name: 'school-checklist-tasks' }
  )
)

function transformToTask(assignment: CanvasAssignment): Task {
  return {
    id: `canvas-${assignment.id}`,
    title: assignment.name,
    dueDate: assignment.due_at,
    courseName: assignment.course_name,
    source: 'canvas',
    completed: false,
  }
}
