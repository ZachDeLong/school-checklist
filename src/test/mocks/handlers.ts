import { http, HttpResponse } from 'msw'

const mockCourses = [
  { id: 123456, name: 'Intro to Computer Science' },
  { id: 789012, name: 'Calculus I' },
]

const mockAssignments = new Map([
  ['123456', [{ id: 1001, name: 'Homework 1', due_at: '2025-02-10T23:59:59Z' }]],
  ['789012', [{ id: 1002, name: 'Quiz 2', due_at: '2025-02-15T11:00:00Z' }]],
])

export const handlers = [
  http.get('/api/canvas/courses', ({ request }) => {
    const url = new URL(request.url)
    const enrollmentState = url.searchParams.get('enrollment_state')

    if (enrollmentState === 'active') {
      return HttpResponse.json(mockCourses)
    }
    return HttpResponse.json([])
  }),

  http.get('/api/canvas/courses/:courseId/assignments', ({ params }) => {
    return HttpResponse.json(mockAssignments.get(String(params.courseId)) ?? [])
  }),
]

export const errorHandlers = {
  unauthorized: http.get('/api/canvas/courses', () => {
    return new HttpResponse(null, { status: 401 })
  }),

  serverError: http.get('/api/canvas/courses', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  invalidPaginationLink: http.get('/api/canvas/courses', () => {
    return HttpResponse.json(mockCourses, {
      headers: {
        Link: '<https://attacker.example/collect?page=2>; rel="next"',
      },
    })
  }),

  invalidJson: http.get('/api/canvas/courses/:courseId/assignments', () => {
    return new HttpResponse('not valid json', {
      headers: { 'Content-Type': 'application/json' },
    })
  }),

  oneInvalidCourse: http.get('/api/canvas/courses/:courseId/assignments', ({ params }) => {
    if (String(params.courseId) === '123456') {
      return new HttpResponse('not valid json', {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return HttpResponse.json(mockAssignments.get(String(params.courseId)) ?? [])
  }),
}
