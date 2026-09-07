import { z } from 'zod'
import { toLocalDateString } from '../utils/dateUtils'
import { useSettingsStore, type CanvasInstance } from '../store/settingsStore'

const CourseSchema = z.object({
  id: z.number(),
  name: z.string(),
})

const AssignmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  due_at: z.string().nullable(),
})

export interface CanvasAssignment {
  id: string
  instance_id: string
  name: string
  due_at: string | null
  course_id: string
  course_name: string
}

export interface CanvasSyncFailure {
  instanceId: string
  instanceName: string
  courseId?: string
  courseName?: string
  message: string
}

export interface CanvasSyncResult {
  assignments: CanvasAssignment[]
  failures: CanvasSyncFailure[]
}

interface InstanceFetchResult {
  assignments: CanvasAssignment[]
  failures: CanvasSyncFailure[]
}

/**
 * Parse the Link header to find the "next" page URL.
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match?.[1] ?? null
}

/**
 * Convert Canvas pagination URLs back into a same-origin proxy request.
 * Never return an upstream URL because the caller attaches the Canvas token.
 */
export function rewriteCanvasNextLink(nextLink: string): string {
  let parsed: URL
  try {
    parsed = new URL(nextLink, 'https://canvas.invalid')
  } catch {
    throw new Error('Canvas returned an invalid pagination link')
  }

  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    (parsed.pathname !== '/api/v1' && !parsed.pathname.startsWith('/api/v1/'))
  ) {
    throw new Error('Canvas returned an invalid pagination link')
  }

  const apiPath = parsed.pathname.slice('/api/v1'.length) || '/'
  return `/api/canvas${apiPath}${parsed.search}`
}

/**
 * Fetch all pages from a paginated Canvas API endpoint.
 */
async function fetchAllPages(url: string, headers: Record<string, string>): Promise<unknown[]> {
  const results: unknown[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers })
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid Canvas token')
      throw new Error(`Canvas API error: ${res.status}`)
    }

    let data: unknown
    try {
      data = await res.json()
    } catch {
      throw new Error('Canvas returned an invalid JSON response')
    }
    if (!Array.isArray(data)) {
      throw new Error('Canvas returned an invalid response shape')
    }
    results.push(...data)

    const linkHeader = res.headers.get('Link')
    const nextLink = parseNextLink(linkHeader)
    if (nextLink) {
      nextUrl = rewriteCanvasNextLink(nextLink)
    } else {
      nextUrl = null
    }
  }

  return results
}

/**
 * Fetch assignments from a single Canvas instance
 */
async function fetchFromInstance(instance: CanvasInstance): Promise<InstanceFetchResult> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${instance.token}`,
    'X-Canvas-Host': instance.url,
  }

  // Get date range: today to N days out based on user's timeframe setting
  const { timeframeDays } = useSettingsStore.getState()
  const today = new Date()
  const endDay = new Date(Date.now() + timeframeDays * 24 * 60 * 60 * 1000)
  const startDate = toLocalDateString(today)
  const endDate = toLocalDateString(endDay)

  // Fetch all active courses with pagination
  const rawCourses = await fetchAllPages('/api/canvas/courses?enrollment_state=active&per_page=100', headers)

  const courses: z.infer<typeof CourseSchema>[] = []
  const failures: CanvasSyncFailure[] = []
  for (const rawCourse of rawCourses) {
    const parsed = CourseSchema.safeParse(rawCourse)
    if (parsed.success) {
      courses.push(parsed.data)
      continue
    }

    const record = typeof rawCourse === 'object' && rawCourse !== null
      ? rawCourse as Record<string, unknown>
      : null
    const rawId = record?.id
    const courseId = typeof rawId === 'number' && Number.isSafeInteger(rawId)
      ? String(rawId)
      : typeof rawId === 'string' && /^\d+$/.test(rawId)
        ? rawId
        : undefined
    const courseName = typeof record?.name === 'string' ? record.name : undefined
    failures.push({
      instanceId: instance.id,
      instanceName: instance.name,
      ...(courseId ? { courseId } : {}),
      ...(courseName ? { courseName } : {}),
      message: 'Canvas returned malformed course data',
    })
  }

  if (courses.length === 0) {
    return { assignments: [], failures }
  }

  // Fetch assignments from each course in parallel
  // Uses per-course endpoint instead of calendar_events (which some Canvas instances restrict)
  const courseResults = await Promise.allSettled(
    courses.map(async (course) => {
      const url = `/api/canvas/courses/${course.id}/assignments?per_page=100&order_by=due_at`
      const rawAssignments = await fetchAllPages(url, headers)
      return { course, assignments: rawAssignments }
    })
  )

  const successfulCourseRequests = courseResults.filter(
    (result): result is PromiseFulfilledResult<{
      course: z.infer<typeof CourseSchema>
      assignments: unknown[]
    }> => result.status === 'fulfilled'
  )

  if (successfulCourseRequests.length === 0) {
    const firstFailure = courseResults.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    )
    if (firstFailure?.reason instanceof Error) throw firstFailure.reason
    throw new Error('Failed to fetch assignments from Canvas')
  }

  const allAssignments: CanvasAssignment[] = []
  courseResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      const course = courses[index]
      failures.push({
        instanceId: instance.id,
        instanceName: instance.name,
        courseId: String(course.id),
        courseName: course.name,
        message: result.reason instanceof Error ? result.reason.message : 'Failed to fetch course assignments',
      })
    }
  })

  for (const result of successfulCourseRequests) {
    const { course, assignments } = result.value

    for (const raw of assignments) {
      const parsed = AssignmentSchema.safeParse(raw)
      if (!parsed.success) continue

      const assignment = parsed.data
      if (!assignment.due_at) continue

      // Filter to assignments within the configured timeframe
      const dueDateStr = toLocalDateString(new Date(assignment.due_at))
      if (dueDateStr < startDate || dueDateStr > endDate) continue

      allAssignments.push({
        id: `${instance.id}:${assignment.id}`,
        instance_id: instance.id,
        name: assignment.name,
        due_at: assignment.due_at,
        course_id: String(course.id),
        course_name: course.name,
      })
    }
  }

  return { assignments: allAssignments, failures }
}

/**
 * Fetch assignments from all configured Canvas instances
 */
export async function fetchAssignments(): Promise<CanvasSyncResult> {
  const { canvasInstances } = useSettingsStore.getState()

  const validInstances = canvasInstances.filter(i => i.url && i.token)

  if (validInstances.length === 0) {
    throw new Error('No Canvas instances configured. Please add your schools in Settings.')
  }

  // Fetch from all instances in parallel
  const results = await Promise.allSettled(
    validInstances.map(instance => fetchFromInstance(instance))
  )

  // Collect all assignments and errors
  const allAssignments: CanvasAssignment[] = []
  const failures: CanvasSyncFailure[] = []
  let successfulInstances = 0

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulInstances++
      allAssignments.push(...result.value.assignments)
      failures.push(...result.value.failures)
    } else {
      const instance = validInstances[index]
      failures.push({
        instanceId: instance.id,
        instanceName: instance.name,
        message: result.reason instanceof Error ? result.reason.message : 'Failed to fetch Canvas instance',
      })
    }
  })

  // If all instances failed, throw an error
  if (successfulInstances === 0 && failures.length > 0) {
    throw new Error(failures.map(failure => `${failure.instanceName}: ${failure.message}`).join('; '))
  }

  // Log warnings for partial failures but still return results
  if (failures.length > 0) {
    console.warn('Some Canvas requests failed:', failures)
  }

  return { assignments: allAssignments, failures }
}
