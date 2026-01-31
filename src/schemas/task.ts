import { z } from 'zod'

export const CanvasPlannerItemSchema = z.object({
  plannable_id: z.number(),
  plannable_type: z.string(),
  plannable: z.object({
    title: z.string(),
    due_at: z.string().nullable(),
  }),
  course_id: z.number().optional(),
  context_name: z.string().optional(),
})

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string().nullable(),
  courseName: z.string(),
  source: z.enum(['canvas', 'manual']),
  completed: z.boolean(),
})

export type CanvasPlannerItem = z.infer<typeof CanvasPlannerItemSchema>
export type Task = z.infer<typeof TaskSchema>
