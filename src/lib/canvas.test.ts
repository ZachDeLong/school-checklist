import { describe, it, expect, beforeEach } from 'vitest'
import { server } from '../test/mocks/server'
import { errorHandlers } from '../test/mocks/handlers'
import { fetchAssignments } from './canvas'
import { useSettingsStore } from '../store/settingsStore'

describe('fetchAssignments', () => {
  beforeEach(() => {
    // Set up mock settings before each test
    useSettingsStore.setState({
      canvasInstances: [{
        id: 'test-instance',
        name: 'Test School',
        token: 'test-token',
        url: 'test.instructure.com',
      }],
    })
  })

  it('fetches and transforms calendar events into assignments', async () => {
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

    await expect(fetchAssignments()).rejects.toThrow('Invalid token for Test School')
  })

  it('throws error on server errors', async () => {
    server.use(errorHandlers.serverError)

    await expect(fetchAssignments()).rejects.toThrow('Canvas API error 500')
  })

  it('throws error on invalid JSON response', async () => {
    server.use(errorHandlers.invalidJson)

    await expect(fetchAssignments()).rejects.toThrow('Failed to parse calendar events')
  })
})
