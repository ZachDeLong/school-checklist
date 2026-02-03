import { http, HttpResponse } from 'msw'

const mockCourses = [
  { id: 123456, name: 'Intro to Computer Science' },
  { id: 789012, name: 'Calculus I' },
]

const mockCalendarEvents = [
  {
    id: '1001',
    title: 'Homework 1',
    all_day_date: '2025-02-10',
    start_at: null,
    end_at: null,
    context_name: 'Intro to Computer Science',
  },
  {
    id: '1002',
    title: 'Quiz 2',
    all_day_date: null,
    start_at: '2025-02-15T10:00:00Z',
    end_at: '2025-02-15T11:00:00Z',
    context_name: 'Calculus I',
  },
]

export const handlers = [
  http.get('/canvas-api/courses', ({ request }) => {
    const url = new URL(request.url)
    const enrollmentState = url.searchParams.get('enrollment_state')

    if (enrollmentState === 'active') {
      return HttpResponse.json(mockCourses)
    }
    return HttpResponse.json([])
  }),

  http.get('/canvas-api/calendar_events', () => {
    return HttpResponse.json(mockCalendarEvents)
  }),
]

export const errorHandlers = {
  unauthorized: http.get('/canvas-api/courses', () => {
    return new HttpResponse(null, { status: 401 })
  }),

  serverError: http.get('/canvas-api/courses', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  invalidJson: http.get('/canvas-api/calendar_events', () => {
    return new HttpResponse('not valid json', {
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}
