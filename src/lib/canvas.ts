import { z } from 'zod'
import { toLocalDateString } from '../utils/dateUtils'
import { useSettingsStore, type CanvasInstance } from '../store/settingsStore'

const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  all_day_date: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  context_name: z.string().optional(),
})

type CalendarEvent = z.infer<typeof CalendarEventSchema>

const CourseSchema = z.object({
  id: z.number(),
  name: z.string(),
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

  // Fetch all courses with pagination
  const rawCourses = await fetchAllPages('/api/canvas/courses?enrollment_state=active&per_page=100', headers)

  const courseIds = rawCourses
    .map((course) => {
      const parsed = CourseSchema.safeParse(course)
      return parsed.success ? String(parsed.data.id) : null
    })
    .filter((id): id is string => id !== null)

  if (courseIds.length === 0) {
    return []
  }

  // Build context_codes for calendar API
  const contextCodes = courseIds.map(id => `course_${id}`).join('&context_codes[]=')

  // Fetch all calendar events with pagination
  const calendarUrl = `/api/canvas/calendar_events?type=assignment&start_date=${startDate}&end_date=${endDate}&context_codes[]=${contextCodes}&per_page=100`

  const rawEvents = await fetchAllPages(calendarUrl, headers)

  const events = rawEvents
    .map((e) => {
      const parsed = CalendarEventSchema.safeParse(e)
      return parsed.success ? parsed.data : null
    })
    .filter((e): e is CalendarEvent => e !== null)

  // Transform to our format, prefixing ID with instance name to ensure uniqueness
  return events.map((event) => {
    // Get due date from all_day_date, start_at, or end_at
    let dueDate = event.all_day_date || event.end_at || event.start_at || null

    // Convert all_day_date to ISO format if needed
    if (dueDate && !dueDate.includes('T')) {
      dueDate = `${dueDate}T23:59:59Z`
    }

    return {
      id: `${instance.id}:${event.id}`,
      name: event.title,
      due_at: dueDate,
      course_id: event.context_name || 'Unknown',
      course_name: event.context_name || 'Unknown Course',
    }
  })
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
