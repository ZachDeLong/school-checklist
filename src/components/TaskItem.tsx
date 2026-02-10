import { useState, useRef, useEffect, memo } from 'react';
import { motion } from 'motion/react';
import { playCheckSound, playUncheckSound } from '../utils/sounds';
import { formatDueDate, getDueStatus } from '../utils/dateUtils';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../schemas/task';
import './TaskItem.css';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  const setCourseAlias = useTaskStore((state) => state.setCourseAlias);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const displayCourseName = useTaskStore(
    (state) => state.courseAliases[task.courseName] || task.courseName
  );
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseInput, setCourseInput] = useState('');
  const courseInputRef = useRef<HTMLInputElement>(null);

  const displayText = task.title;
  const dueLabel = formatDueDate(task.dueDate);
  const dueStatus = getDueStatus(task.dueDate);

  useEffect(() => {
    if (isEditingCourse && courseInputRef.current) {
      courseInputRef.current.focus();
      courseInputRef.current.select();
    }
  }, [isEditingCourse]);

  function handleToggle() {
    if (soundEnabled) {
      if (!task.completed) {
        playCheckSound();
      } else {
        playUncheckSound();
      }
    }
    onToggle(task.id);
  }

  function handleCourseClick(e: React.MouseEvent) {
    e.stopPropagation();
    setCourseInput(displayCourseName);
    setIsEditingCourse(true);
  }

  function handleCourseBlur() {
    if (courseInput.trim() && courseInput.trim() !== displayCourseName) {
      setCourseAlias(task.courseName, courseInput.trim());
    }
    setIsEditingCourse(false);
  }

  function handleCourseKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCourseBlur();
    } else if (e.key === 'Escape') {
      setIsEditingCourse(false);
    }
  }

  return (
    <motion.div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: task.completed ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        type: 'spring', stiffness: 400, damping: 35,
        opacity: { duration: 0.3 },
      }}
    >
      <button
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={handleToggle}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        <svg viewBox="0 0 24 24" fill="none" className="checkmark-svg">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: task.completed ? 1 : 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          />
        </svg>
      </button>

      <div className="task-content">
        <div className="task-text-wrapper">
          <span className={`task-text ${task.completed ? 'completed' : ''}`}>
            {displayText}
          </span>
          <motion.span
            className="strikethrough-line"
            initial={false}
            animate={{ scaleX: task.completed ? 1 : 0 }}
            transition={{ duration: 0.2, delay: task.completed ? 0.05 : 0 }}
          />
        </div>
        <div className="task-meta">
          {task.courseName && (
            isEditingCourse ? (
              <input
                ref={courseInputRef}
                type="text"
                className="course-edit-input"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                onBlur={handleCourseBlur}
                onKeyDown={handleCourseKeyDown}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                className="task-course task-course-editable"
                onClick={handleCourseClick}
                title="Click to rename"
              >
                {displayCourseName}
              </button>
            )
          )}
          {dueLabel && (
            <span className={`task-due ${dueStatus}`}>{dueLabel}</span>
          )}
        </div>
      </div>

      {task.source === 'manual' && (
        <button
          className="task-delete"
          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
          aria-label="Delete task"
        >
          &times;
        </button>
      )}
    </motion.div>
  );
}

export default memo(TaskItem);
