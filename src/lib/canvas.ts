import { z } from 'zod'
import { toLocalDateString } from '../utils/dateUtils'
import { useSettingsStore } from '../store/settingsStore'

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

export async function fetchAssignments(): Promise<CanvasAssignment[]> {
  const { canvasToken } = useSettingsStore.getState()

  if (!canvasToken) {
    throw new Error('Canvas token not configured. Please add your token in Settings.')
  }

  const headers = {
    'Authorization': `Bearer ${canvasToken}`,
  }

  // Get date range: today to 2 weeks out (using local dates)
  const today = new Date()
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const startDate = toLocalDateString(today)
  const endDate = toLocalDateString(twoWeeksOut)

  // First, get all active courses to build context_codes
  const coursesRes = await fetch('/canvas-api/courses?enrollment_state=active', { headers })
  if (!coursesRes.ok) {
    if (coursesRes.status === 401) throw new Error('Invalid Canvas token')
    throw new Error(`Canvas API error: ${coursesRes.status}`)
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

  // Build context_codes for calendar API
  const contextCodes = courseIds.map(id => `course_${id}`).join('&context_codes[]=')

  // Fetch calendar events (includes assignments, quizzes, discussions)
  const calendarUrl = `/canvas-api/calendar_events?type=assignment&start_date=${startDate}&end_date=${endDate}&context_codes[]=${contextCodes}&per_page=100`

  const calendarRes = await fetch(calendarUrl, { headers })
  if (!calendarRes.ok) {
    throw new Error(`Calendar API error: ${calendarRes.status}`)
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
    throw new Error('Failed to parse calendar events')
  }

  // Transform to our format
  return events.map((event) => {
    // Get due date from all_day_date, start_at, or end_at
    let dueDate = event.all_day_date || event.end_at || event.start_at || null

    // Convert all_day_date to ISO format if needed
    if (dueDate && !dueDate.includes('T')) {
      dueDate = `${dueDate}T23:59:59Z`
    }

    return {
      id: event.id,
      name: event.title,
      due_at: dueDate,
      course_id: event.context_name || 'Unknown',
      course_name: event.context_name || 'Unknown Course',
    }
  })
}
