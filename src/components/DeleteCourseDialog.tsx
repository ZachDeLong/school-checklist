import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { DeleteStrategy } from '../store/taskStore'
import './DeleteCourseDialog.css'

interface CourseOption {
  value: string
  label: string
}

interface DeleteCourseDialogProps {
  displayName: string
  taskCount: number
  availableCourses: CourseOption[]
  onConfirm: (strategy: DeleteStrategy) => void
  onCancel: () => void
}

export default function DeleteCourseDialog({
  displayName,
  taskCount,
  availableCourses,
  onConfirm,
  onCancel,
}: DeleteCourseDialogProps) {
  const [strategy, setStrategy] = useState<'keep' | 'reassign' | 'delete'>('keep')
  const [reassignTarget, setReassignTarget] = useState(availableCourses[0]?.value ?? '')

  function handleConfirm() {
    switch (strategy) {
      case 'keep':
        onConfirm({ type: 'keep' })
        break
      case 'reassign':
        onConfirm({ type: 'reassign', target: reassignTarget })
        break
      case 'delete':
        onConfirm({ type: 'delete' })
        break
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onCancel()
  }

  const showReassign = availableCourses.length > 0

  return (
    <motion.div
      className="delete-dialog-backdrop"
      onMouseDown={handleBackdropClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="delete-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className="delete-dialog-header">
          <h2 className="delete-dialog-title">Delete "{displayName}"?</h2>
        </div>

        <div className="delete-dialog-content">
          <p className="delete-dialog-subtitle">
            This course has {taskCount} {taskCount === 1 ? 'task' : 'tasks'}.
          </p>

          <div className="delete-dialog-options">
            <label className="delete-dialog-option">
              <input
                type="radio"
                name="delete-strategy"
                checked={strategy === 'keep'}
                onChange={() => setStrategy('keep')}
              />
              <span className="delete-dialog-option-text">
                Keep tasks (move to Personal)
              </span>
            </label>

            {showReassign && (
              <label className="delete-dialog-option">
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={strategy === 'reassign'}
                  onChange={() => setStrategy('reassign')}
                />
                <span className="delete-dialog-option-text">
                  Reassign tasks to:
                  <select
                    className="delete-dialog-select"
                    value={reassignTarget}
                    onChange={(e) => {
                      setReassignTarget(e.target.value)
                      setStrategy('reassign')
                    }}
                    disabled={strategy !== 'reassign'}
                  >
                    {availableCourses.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            )}

            <label className="delete-dialog-option delete-dialog-option-danger">
              <input
                type="radio"
                name="delete-strategy"
                checked={strategy === 'delete'}
                onChange={() => setStrategy('delete')}
              />
              <span className="delete-dialog-option-text">
                Delete all {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
              </span>
            </label>
          </div>
        </div>

        <div className="delete-dialog-footer">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-danger" onClick={handleConfirm}>
            Delete Course
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
