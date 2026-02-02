import { z } from 'zod'

const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  all_day_date: z.string().nullable().optional(),
  start_at: z.string().nullable().optional(),
  end_at: z.string().nullable().optional(),
  context_name: z.string().optional(),
})

type CalendarEvent = z.infer<typeof CalendarEventSchema>

export interface CanvasAssignment {
  id: string
  name: string
  due_at: string | null
  course_id: string
  course_name: string
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function fetchAssignments(): Promise<CanvasAssignment[]> {
  // Get date range: today to 2 weeks out (using local dates)
  const today = new Date()
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const startDate = toLocalDateString(today)
  const endDate = toLocalDateString(twoWeeksOut)

  // First, get all active courses to build context_codes
  const coursesRes = await fetch('/canvas-api/courses?enrollment_state=active')
  if (!coursesRes.ok) {
    if (coursesRes.status === 401) throw new Error('Invalid Canvas token')
    throw new Error(`Canvas API error: ${coursesRes.status}`)
  }

  const coursesText = await coursesRes.text()

  // Extract course IDs using regex to avoid precision loss
  const courseIds: string[] = []
  const courseRegex = /\{"id":(\d+),"name":"[^"]+"/g
  let match
  while ((match = courseRegex.exec(coursesText)) !== null) {
    if (!courseIds.includes(match[1])) {
      courseIds.push(match[1])
    }
  }

  // Build context_codes for calendar API
  const contextCodes = courseIds.map(id => `course_${id}`).join('&context_codes[]=')

  // Fetch calendar events (includes assignments, quizzes, discussions)
  const calendarUrl = `/canvas-api/calendar_events?type=assignment&start_date=${startDate}&end_date=${endDate}&context_codes[]=${contextCodes}&per_page=100`

  const calendarRes = await fetch(calendarUrl)
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
