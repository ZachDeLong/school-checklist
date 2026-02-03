import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from './taskStore'

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
      expect(tasks[0].id).toMatch(/^manual-\d+$/)
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

  describe('courseAliases', () => {
    it('sets and retrieves course alias', () => {
      const { setCourseAlias } = useTaskStore.getState()

      setCourseAlias('Long Course Name', 'Short')

      expect(useTaskStore.getState().getCourseDisplayName('Long Course Name')).toBe('Short')
    })

    it('returns original name if no alias exists', () => {
      const { getCourseDisplayName } = useTaskStore.getState()

      expect(getCourseDisplayName('No Alias')).toBe('No Alias')
    })
  })
})
