import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchAssignments } from '../lib/canvas'
import { useTaskStore } from './taskStore'

vi.mock('../lib/canvas', () => ({
  fetchAssignments: vi.fn(),
}))

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      tasks: [],
      lastFetched: null,
      syncing: false,
      error: null,
      courseAliases: {},
      customOrder: [],
      customCourses: [],
    })
    vi.mocked(fetchAssignments).mockReset()
  })

  describe('addManualTask', () => {
    it('adds a new manual task with default course', () => {
      const { addManualTask } = useTaskStore.getState()

      addManualTask('Test task', null)

      const { tasks } = useTaskStore.getState()
      expect(tasks).toHaveLength(1)
      expect(tasks[0]).toMatchObject({
        title: 'Test task',
        dueDate: null,
        courseName: 'Personal',
        source: 'manual',
        completed: false,
      })
      expect(tasks[0].id).toMatch(/^manual-[0-9a-f-]{36}$/)
    })

    it('adds a task with due date and custom course', () => {
      const { addManualTask } = useTaskStore.getState()

      addManualTask('Task with date', '2025-02-15', 'Math')

      const { tasks } = useTaskStore.getState()
      expect(tasks[0]).toMatchObject({
        title: 'Task with date',
        dueDate: '2025-02-15',
        courseName: 'Math',
      })
    })

    it('keeps IDs unique when tasks are created in the same millisecond', () => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      const { addManualTask } = useTaskStore.getState()

      addManualTask('First task', null)
      addManualTask('Second task', null)

      const ids = useTaskStore.getState().tasks.map(task => task.id)
      expect(new Set(ids).size).toBe(2)
      now.mockRestore()
    })
  })

  describe('toggleComplete', () => {
    it('toggles task completion status', () => {
      useTaskStore.setState({
        tasks: [
          { id: 'test-1', title: 'Task 1', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
        ],
      })

      const { toggleComplete } = useTaskStore.getState()

      toggleComplete('test-1')
      expect(useTaskStore.getState().tasks[0].completed).toBe(true)

      toggleComplete('test-1')
      expect(useTaskStore.getState().tasks[0].completed).toBe(false)
    })

    it('does not affect other tasks', () => {
      useTaskStore.setState({
        tasks: [
          { id: 'test-1', title: 'Task 1', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
          { id: 'test-2', title: 'Task 2', dueDate: null, courseName: 'Personal', source: 'manual', completed: true },
        ],
      })

      const { toggleComplete } = useTaskStore.getState()
      toggleComplete('test-1')

      const { tasks } = useTaskStore.getState()
      expect(tasks[0].completed).toBe(true)
      expect(tasks[1].completed).toBe(true)
    })
  })

  describe('syncCanvas', () => {
    it('preserves completion by assignment identity, not a shared title', async () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'canvas-school-a:101',
            title: 'Final Project',
            dueDate: '2025-02-10T12:00:00Z',
            courseName: 'Course A',
            source: 'canvas',
            completed: true,
          },
          {
            id: 'canvas-school-a:202',
            title: 'Final Project',
            dueDate: '2025-02-11T12:00:00Z',
            courseName: 'Course B',
            source: 'canvas',
            completed: false,
          },
        ],
      })
      vi.mocked(fetchAssignments).mockResolvedValue({
        assignments: [{
          id: 'school-a:101',
          instance_id: 'school-a',
          name: 'Renamed Final Project',
          due_at: '2025-02-12T12:00:00Z',
          course_id: '1',
          course_name: 'Course A',
        },
        {
          id: 'school-a:202',
          instance_id: 'school-a',
          name: 'Final Project',
          due_at: '2025-02-13T12:00:00Z',
          course_id: '2',
          course_name: 'Course B',
        }],
        failures: [],
      })

      await useTaskStore.getState().syncCanvas(true)

      expect(useTaskStore.getState().tasks).toEqual([
        expect.objectContaining({
          id: 'canvas-school-a:101',
          title: 'Renamed Final Project',
          completed: true,
        }),
        expect.objectContaining({
          id: 'canvas-school-a:202',
          title: 'Final Project',
          completed: false,
        }),
      ])
    })

    it('retains saved tasks only for Canvas courses that failed to refresh', async () => {
      useTaskStore.setState({
        tasks: [
          {
            id: 'canvas-school-a:101',
            title: 'Saved Course A task',
            dueDate: '2025-02-10T12:00:00Z',
            courseName: 'Course A',
            source: 'canvas',
            completed: true,
            canvasInstanceId: 'school-a',
            canvasCourseId: '1',
          },
          {
            id: 'canvas-school-a:202',
            title: 'Stale Course B task',
            dueDate: '2025-02-11T12:00:00Z',
            courseName: 'Course B',
            source: 'canvas',
            completed: false,
            canvasInstanceId: 'school-a',
            canvasCourseId: '2',
          },
          {
            id: 'manual-1',
            title: 'Personal task',
            dueDate: null,
            courseName: 'Personal',
            source: 'manual',
            completed: false,
          },
        ],
      })
      vi.mocked(fetchAssignments).mockResolvedValue({
        assignments: [{
          id: 'school-a:303',
          instance_id: 'school-a',
          name: 'Fresh Course B task',
          due_at: '2025-02-13T12:00:00Z',
          course_id: '2',
          course_name: 'Course B',
        }],
        failures: [{
          instanceId: 'school-a',
          instanceName: 'School A',
          courseId: '1',
          courseName: 'Course A',
          message: 'Canvas API error: 503',
        }],
      })

      await useTaskStore.getState().syncCanvas(true)

      expect(useTaskStore.getState().tasks).toEqual([
        expect.objectContaining({ id: 'canvas-school-a:303', title: 'Fresh Course B task' }),
        expect.objectContaining({ id: 'canvas-school-a:101', title: 'Saved Course A task', completed: true }),
        expect.objectContaining({ id: 'manual-1', title: 'Personal task' }),
      ])
      expect(useTaskStore.getState().error).toMatch(/previously saved assignments/)
    })
  })

  describe('reorderTasks', () => {
    it('reorders tasks based on drag position', () => {
      useTaskStore.setState({
        tasks: [
          { id: 'test-1', title: 'Task 1', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
          { id: 'test-2', title: 'Task 2', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
          { id: 'test-3', title: 'Task 3', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
        ],
        customOrder: [],
      })

      const { reorderTasks } = useTaskStore.getState()

      // Move task-1 to position of task-3
      reorderTasks('test-1', 'test-3')

      const { customOrder } = useTaskStore.getState()
      expect(customOrder).toEqual(['test-2', 'test-3', 'test-1'])
    })

    it('initializes customOrder from tasks if empty', () => {
      useTaskStore.setState({
        tasks: [
          { id: 'test-1', title: 'Task 1', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
          { id: 'test-2', title: 'Task 2', dueDate: null, courseName: 'Personal', source: 'manual', completed: false },
        ],
        customOrder: [],
      })

      const { reorderTasks } = useTaskStore.getState()
      reorderTasks('test-2', 'test-1')

      const { customOrder } = useTaskStore.getState()
      expect(customOrder).toContain('test-1')
      expect(customOrder).toContain('test-2')
    })
  })

  describe('addCustomCourse', () => {
    it('adds a new custom course', () => {
      const { addCustomCourse } = useTaskStore.getState()

      addCustomCourse('My Course')

      const { customCourses } = useTaskStore.getState()
      expect(customCourses).toContain('My Course')
    })

    it('trims whitespace from course name', () => {
      const { addCustomCourse } = useTaskStore.getState()

      addCustomCourse('  Spaced Course  ')

      const { customCourses } = useTaskStore.getState()
      expect(customCourses).toContain('Spaced Course')
    })

    it('does not add duplicate courses', () => {
      useTaskStore.setState({ customCourses: ['Existing'] })

      const { addCustomCourse } = useTaskStore.getState()
      addCustomCourse('Existing')

      const { customCourses } = useTaskStore.getState()
      expect(customCourses).toEqual(['Existing'])
    })

    it('does not add empty course names', () => {
      const { addCustomCourse } = useTaskStore.getState()

      addCustomCourse('')
      addCustomCourse('   ')

      const { customCourses } = useTaskStore.getState()
      expect(customCourses).toEqual([])
    })
  })

})
