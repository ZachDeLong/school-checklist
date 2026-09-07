import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { server } from '../test/mocks/server'
import { errorHandlers } from '../test/mocks/handlers'
import { fetchAssignments } from './canvas'
import { useSettingsStore } from '../store/settingsStore'

describe('fetchAssignments', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-02-01T12:00:00Z'))

    // Set up mock settings before each test
    useSettingsStore.setState({
      canvasInstances: [{
        id: 'test-instance',
        name: 'Test School',
        token: 'test-token',
        url: 'test.instructure.com',
      }],
      timeframeDays: 30,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches and transforms per-course assignments', async () => {
    const assignments = await fetchAssignments()

    expect(assignments).toHaveLength(2)
    expect(assignments[0]).toMatchObject({
      id: 'test-instance:1001',
      name: 'Homework 1',
      course_name: 'Intro to Computer Science',
    })
    expect(assignments[1]).toMatchObject({
      id: 'test-instance:1002',
      name: 'Quiz 2',
      course_name: 'Calculus I',
    })
  })

  it('handles all_day_date by converting to ISO format', async () => {
    const assignments = await fetchAssignments()

    // all_day_date should be converted to ISO format with T23:59:59Z
    expect(assignments[0].due_at).toBe('2025-02-10T23:59:59Z')
  })

  it('uses start_at/end_at when all_day_date is null', async () => {
    const assignments = await fetchAssignments()

    // Should use end_at when all_day_date is null
    expect(assignments[1].due_at).toBe('2025-02-15T11:00:00Z')
  })

  it('throws error on 401 unauthorized', async () => {
    server.use(errorHandlers.unauthorized)

    await expect(fetchAssignments()).rejects.toThrow('Test School: Invalid Canvas token')
  })

  it('throws error on server errors', async () => {
    server.use(errorHandlers.serverError)

    await expect(fetchAssignments()).rejects.toThrow('Test School: Canvas API error: 500')
  })

  it('skips courses that return malformed assignment data', async () => {
    server.use(errorHandlers.invalidJson)

    await expect(fetchAssignments()).resolves.toEqual([])
  })
})
