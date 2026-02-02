import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { playCheckSound, playUncheckSound } from '../utils/sounds';
import { useTaskStore } from '../store/taskStore';
import './TaskItem.css';

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDueStatus(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  if (date < now) return 'overdue';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return 'due-today';
  if (date.toDateString() === tomorrow.toDateString()) return 'due-soon';
  return '';
}

export default function TaskItem({ task, onToggle }) {
  const { setCourseAlias, getCourseDisplayName } = useTaskStore();
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseInput, setCourseInput] = useState('');
  const courseInputRef = useRef(null);

  const displayText = task.title || task.text;
  const dueLabel = formatDueDate(task.dueDate);
  const dueStatus = getDueStatus(task.dueDate);
  const displayCourseName = getCourseDisplayName(task.courseName);

  useEffect(() => {
    if (isEditingCourse && courseInputRef.current) {
      courseInputRef.current.focus();
      courseInputRef.current.select();
    }
  }, [isEditingCourse]);

  function handleToggle() {
    if (!task.completed) {
      playCheckSound();
    } else {
      playUncheckSound();
    }
    onToggle(task.id);
  }

  function handleCourseClick(e) {
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

  function handleCourseKeyDown(e) {
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
    </motion.div>
  );
}
