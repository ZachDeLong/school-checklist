import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAssignments, type CanvasAssignment, type CanvasSyncFailure } from '../lib/canvas'
import type { Task } from '../schemas/task'

export type { Task }

export type DeleteStrategy =
  | { type: 'keep' }
  | { type: 'reassign'; target: string }
  | { type: 'delete' }

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
  renameCourse: (courseName: string, newDisplayName: string) => void
  deleteCourse: (courseName: string, strategy: DeleteStrategy) => void
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
          const syncResult = await fetchAssignments()
          const canvasTasks = syncResult.assignments.map(transformToTask)

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
          const staleTasksFromFailures = existingTasks.filter(
            task => task.source === 'canvas' && syncResult.failures.some(failure => taskMatchesFailure(task, failure))
          )

          // Canvas IDs include both the configured instance and assignment ID.
          // Titles are not identities: two courses commonly reuse names such as
          // "Final Project" or "Week 1 Discussion".
          const completedCanvasIds = new Set(
            existingTasks
              .filter(t => t.source === 'canvas' && t.completed)
              .map(t => t.id)
          )

          const mergedCanvasTasks = uniqueCanvasTasks.map(t => ({
            ...t,
            completed: completedCanvasIds.has(t.id)
          }))
          const refreshedIds = new Set(mergedCanvasTasks.map(task => task.id))
          const retainedStaleTasks = staleTasksFromFailures.filter(task => !refreshedIds.has(task.id))

          set({
            tasks: [...mergedCanvasTasks, ...retainedStaleTasks, ...manualTasks],
            lastFetched: Date.now(),
            syncing: false,
            error: syncResult.failures.length > 0
              ? 'Some Canvas courses could not be refreshed. Showing their previously saved assignments.'
              : null,
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
          id: `manual-${crypto.randomUUID()}`,
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

      renameCourse: (courseName, newDisplayName) => set((state) => {
        const trimmed = newDisplayName.trim()
        if (!trimmed || trimmed === 'Personal') return state

        const hasCanvasTasks = state.tasks.some(
          t => t.source === 'canvas' && t.courseName === courseName
        )

        if (hasCanvasTasks) {
          // Canvas or mixed: use alias
          return {
            courseAliases: { ...state.courseAliases, [courseName]: trimmed }
          }
        }

        // Manual-only: rename directly on tasks and in customCourses
        return {
          tasks: state.tasks.map(t =>
            t.courseName === courseName ? { ...t, courseName: trimmed } : t
          ),
          customCourses: state.customCourses.map(c =>
            c === courseName ? trimmed : c
          ),
        }
      }),

      deleteCourse: (courseName, strategy) => set((state) => {
        let tasks = state.tasks
        let customOrder = state.customOrder

        switch (strategy.type) {
          case 'keep':
            tasks = tasks.map(t =>
              t.courseName === courseName ? { ...t, courseName: 'Personal' } : t
            )
            break
          case 'reassign':
            tasks = tasks.map(t =>
              t.courseName === courseName ? { ...t, courseName: strategy.target } : t
            )
            break
          case 'delete': {
            const deletedIds = new Set(
              tasks.filter(t => t.courseName === courseName).map(t => t.id)
            )
            tasks = tasks.filter(t => t.courseName !== courseName)
            customOrder = customOrder.filter(id => !deletedIds.has(id))
            break
          }
        }

        const { [courseName]: _, ...remainingAliases } = state.courseAliases

        return {
          tasks,
          customOrder,
          customCourses: state.customCourses.filter(c => c !== courseName),
          courseAliases: remainingAliases,
        }
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
    canvasInstanceId: assignment.instance_id,
    canvasCourseId: assignment.course_id,
  }
}

function taskMatchesFailure(task: Task, failure: CanvasSyncFailure): boolean {
  const legacyInstanceId = task.id.startsWith('canvas-')
    ? task.id.slice('canvas-'.length).split(':')[0]
    : undefined
  const instanceId = task.canvasInstanceId ?? legacyInstanceId
  if (instanceId !== failure.instanceId) return false
  if (!failure.courseId) return true
  if (task.canvasCourseId) return task.canvasCourseId === failure.courseId
  return task.courseName === failure.courseName
}
