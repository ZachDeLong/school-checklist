import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAssignments, type CanvasAssignment } from '../lib/canvas'
import type { Task } from '../schemas/task'

export type { Task }

interface TaskStore {
  tasks: Task[]
  lastFetched: number | null
  syncing: boolean
  error: string | null
  courseAliases: Record<string, string>
  customOrder: string[]
  customCourses: string[]

  syncCanvas: (force?: boolean) => Promise<void>
  toggleComplete: (id: string) => void
  addManualTask: (title: string, dueDate: string | null, courseName?: string) => void
  deleteTask: (id: string) => void
  setCourseAlias: (original: string, alias: string) => void
  reorderTasks: (activeId: string, overId: string) => void
  addCustomCourse: (name: string) => void
}

const STALE_THRESHOLD = 60 * 60 * 1000 // 1 hour

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      lastFetched: null,
      syncing: false,
      error: null,
      courseAliases: {},
      customOrder: [],
      customCourses: [],

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

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        customOrder: state.customOrder.filter(orderId => orderId !== id),
      })),

      setCourseAlias: (original, alias) => set((state) => ({
        courseAliases: {
          ...state.courseAliases,
          [original]: alias.trim() || original,
        }
      })),

      reorderTasks: (activeId, overId) => set((state) => {
        // If items aren't in customOrder yet, initialize from current task order
        let order = [...state.customOrder]
        const taskIds = state.tasks.map(t => t.id)

        // Add any missing task IDs to the order
        for (const id of taskIds) {
          if (!order.includes(id)) {
            order.push(id)
          }
        }
        // Remove any IDs no longer in tasks
        order = order.filter(id => taskIds.includes(id))

        const activeIdx = order.indexOf(activeId)
        const overIdx = order.indexOf(overId)

        if (activeIdx === -1 || overIdx === -1) return state

        // Move item from old position to new position
        order.splice(activeIdx, 1)
        order.splice(overIdx, 0, activeId)

        return { customOrder: order }
      }),

      addCustomCourse: (name) => set((state) => {
        const trimmed = name.trim()
        if (!trimmed || state.customCourses.includes(trimmed)) return state
        return { customCourses: [...state.customCourses, trimmed] }
      }),
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
