import { z } from 'zod'

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string().nullable(),
  courseName: z.string(),
  source: z.enum(['canvas', 'manual']),
  completed: z.boolean(),
  canvasInstanceId: z.string().optional(),
  canvasCourseId: z.string().optional(),
})

export type Task = z.infer<typeof TaskSchema>
