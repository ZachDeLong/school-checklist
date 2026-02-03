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
 * Safely parse JSON that may contain large integers that would lose precision.
 * Converts large integers (16+ digits) to strings to prevent precision loss.
 */
function safeJsonParse<T>(text: string): T {
  const safeText = text.replace(/:(\s*)(\d{16,})([,}\]])/g, ':"$2"$3')
  return JSON.parse(safeText)
}

/**
 * Fetch assignments from a single Canvas instance
 */
async function fetchFromInstance(instance: CanvasInstance): Promise<CanvasAssignment[]> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${instance.token}`,
    'X-Canvas-Host': instance.url,
  }

  // Get date range: today to 7 days out (using local dates)
  const today = new Date()
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const startDate = toLocalDateString(today)
  const endDate = toLocalDateString(sevenDaysOut)

  // First, get all active courses to build context_codes
  const coursesRes = await fetch('/api/canvas/courses?enrollment_state=active', { headers })
  if (!coursesRes.ok) {
    if (coursesRes.status === 401) throw new Error(`Invalid token for ${instance.name}`)
    throw new Error(`${instance.name}: Canvas API error ${coursesRes.status}`)
  }

  const coursesText = await coursesRes.text()

  // Parse courses using Zod schema for validation
  let courseIds: string[] = []
  try {
    const parsed = safeJsonParse<unknown[]>(coursesText)
    courseIds = parsed
      .map((course) => {
        try {
          const validated = CourseSchema.parse(course)
          return String(validated.id)
        } catch {
          return null
        }
      })
      .filter((id): id is string => id !== null)
  } catch {
    // If JSON parsing fails entirely, fall back to empty array
    courseIds = []
  }

  if (courseIds.length === 0) {
    return []
  }

  // Build context_codes for calendar API
  const contextCodes = courseIds.map(id => `course_${id}`).join('&context_codes[]=')

  // Fetch calendar events (includes assignments, quizzes, discussions)
  const calendarUrl = `/api/canvas/calendar_events?type=assignment&start_date=${startDate}&end_date=${endDate}&context_codes[]=${contextCodes}&per_page=100`

  const calendarRes = await fetch(calendarUrl, { headers })
  if (!calendarRes.ok) {
    throw new Error(`${instance.name}: Calendar API error ${calendarRes.status}`)
  }

  const calendarText = await calendarRes.text()
  let events: CalendarEvent[] = []

  try {
    const parsed = JSON.parse(calendarText)
    events = parsed.map((e: unknown) => {
      try {
        return CalendarEventSchema.parse(e)
      } catch {
        return null
      }
    }).filter((e: CalendarEvent | null): e is CalendarEvent => e !== null)
  } catch {
    throw new Error(`${instance.name}: Failed to parse calendar events`)
  }

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
