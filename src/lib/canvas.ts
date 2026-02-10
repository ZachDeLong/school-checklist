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
  name: string
  due_at: string | null
  course_id: string
  course_name: string
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

    const data: unknown = await res.json()
    if (!Array.isArray(data)) break
    results.push(...data)

    const linkHeader = res.headers.get('Link')
    const nextLink = parseNextLink(linkHeader)
    if (nextLink) {
      // Canvas returns absolute URLs; rewrite to go through our proxy
      nextUrl = nextLink.replace(/^https?:\/\/[^/]+\/api\/v1/, '/api/canvas')
    } else {
      nextUrl = null
    }
  }

  return results
}

/**
 * Fetch assignments from a single Canvas instance
 */
async function fetchFromInstance(instance: CanvasInstance): Promise<CanvasAssignment[]> {
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

  const courses = rawCourses
    .map((course) => {
      const parsed = CourseSchema.safeParse(course)
      return parsed.success ? parsed.data : null
    })
    .filter((c): c is z.infer<typeof CourseSchema> => c !== null)

  if (courses.length === 0) {
    return []
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

  const allAssignments: CanvasAssignment[] = []

  for (const result of courseResults) {
    if (result.status !== 'fulfilled') continue

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
        name: assignment.name,
        due_at: assignment.due_at,
        course_id: String(course.id),
        course_name: course.name,
      })
    }
  }

  return allAssignments
}

/**
 * Fetch assignments from all configured Canvas instances
 */
export async function fetchAssignments(): Promise<CanvasAssignment[]> {
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
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allAssignments.push(...result.value)
    } else {
      errors.push(`${validInstances[index].name}: ${result.reason.message}`)
    }
  })

  // If all instances failed, throw an error
  if (allAssignments.length === 0 && errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  // Log warnings for partial failures but still return results
  if (errors.length > 0) {
    console.warn('Some Canvas instances failed:', errors)
  }

  return allAssignments
}
