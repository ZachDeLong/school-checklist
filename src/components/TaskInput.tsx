import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { formatDisplayDate } from '../utils/dateUtils';
import { useTaskStore } from '../store/taskStore';
import Dropdown, { type DropdownOption } from './Dropdown';
import CalendarPicker from './CalendarPicker';
import DeleteCourseDialog from './DeleteCourseDialog';
import './TaskInput.css';

interface TaskInputProps {
  onAddTask: (text: string, dueDate: string | null, courseName: string) => void;
  courses?: string[];
  onAddCourse?: (name: string) => void;
}

export default function TaskInput({ onAddTask, courses = [], onAddCourse }: TaskInputProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('Personal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [editingCourse, setEditingCourse] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const courseInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const tasks = useTaskStore((s) => s.tasks);
  const courseAliases = useTaskStore((s) => s.courseAliases);
  const renameCourse = useTaskStore((s) => s.renameCourse);
  const deleteCourse = useTaskStore((s) => s.deleteCourse);

  useEffect(() => {
    if (editingCourse && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCourse]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAddTask(text.trim(), dueDate || null, selectedCourse);
    setText('');
    setDueDate('');
    setSelectedCourse('Personal');
    setShowDatePicker(false);
  }

  function handleDateClick() {
    setShowDatePicker(!showDatePicker);
  }

  function handleCourseChange(value: string) {
    if (value === '__add_new__') {
      setIsAddingCourse(true);
      setNewCourseName('');
      setTimeout(() => courseInputRef.current?.focus(), 0);
    } else {
      setSelectedCourse(value);
    }
  }

  function handleAddCourse() {
    const trimmed = newCourseName.trim();
    if (trimmed && onAddCourse) {
      onAddCourse(trimmed);
      setSelectedCourse(trimmed);
    }
    setIsAddingCourse(false);
    setNewCourseName('');
  }

  function handleCourseInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCourse();
    } else if (e.key === 'Escape') {
      setIsAddingCourse(false);
      setNewCourseName('');
    }
  }

  // --- Edit course ---

  function startEdit(courseName: string) {
    const displayName = courseAliases[courseName] || courseName;
    setEditingCourse(courseName);
    setEditValue(displayName);
  }

  function confirmEdit() {
    if (editingCourse && editValue.trim()) {
      renameCourse(editingCourse, editValue.trim());
      // If it was a manual-only course, the raw name changed
      const hasCanvas = tasks.some(
        (t) => t.source === 'canvas' && t.courseName === editingCourse
      );
      if (!hasCanvas && selectedCourse === editingCourse) {
        setSelectedCourse(editValue.trim());
      }
    }
    setEditingCourse(null);
    setEditValue('');
  }

  function cancelEdit() {
    setEditingCourse(null);
    setEditValue('');
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      cancelEdit();
    }
  }

  // --- Delete course ---

  function startDelete(courseName: string) {
    const taskCount = tasks.filter((t) => t.courseName === courseName).length;
    if (taskCount === 0) {
      // No tasks — just remove the course directly
      deleteCourse(courseName, { type: 'keep' });
      if (selectedCourse === courseName) setSelectedCourse('Personal');
      return;
    }
    setDeletingCourse(courseName);
  }

  function handleDeleteConfirm(strategy: import('../store/taskStore').DeleteStrategy) {
    if (deletingCourse) {
      // If reassigning to a manual course, use the raw name
      deleteCourse(deletingCourse, strategy);
      if (selectedCourse === deletingCourse) setSelectedCourse('Personal');
    }
    setDeletingCourse(null);
  }

  // --- Course type helpers ---

  function hasCanvasTasks(courseName: string) {
    return tasks.some((t) => t.source === 'canvas' && t.courseName === courseName);
  }

  function canDeleteCourse(courseName: string) {
    // Can't delete Canvas or mixed courses (Canvas tasks would return on sync)
    return !hasCanvasTasks(courseName);
  }

  function getDisplayName(courseName: string) {
    return courseAliases[courseName] || courseName;
  }

  // --- Dropdown suffix ---

  function renderCourseSuffix(option: DropdownOption) {
    if (option.value === 'Personal' || option.value === '__add_new__') return null;

    return (
      <span
        className="course-item-actions"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="course-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            startEdit(option.value);
          }}
          aria-label={`Rename ${option.label}`}
        >
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path
              d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {canDeleteCourse(option.value) && (
          <button
            type="button"
            className="course-action-btn course-action-btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              startDelete(option.value);
            }}
            aria-label={`Delete ${option.label}`}
          >
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
              <path
                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }

  // --- Delete dialog data ---

  const deletingTaskCount = deletingCourse
    ? tasks.filter((t) => t.courseName === deletingCourse).length
    : 0;

  const deletingAvailableCourses = deletingCourse
    ? [
        { value: 'Personal', label: 'Personal' },
        ...courses
          .filter((c) => c !== deletingCourse)
          .map((c) => ({ value: c, label: getDisplayName(c) })),
      ].filter(
        // Remove "Personal" from reassign if it's the only option (identical to "keep")
        (_, i, arr) => arr.length > 1 || i > 0
      )
    : [];

  // Don't show reassign if only Personal is available (it's the same as "keep")
  const filteredAvailableCourses = deletingAvailableCourses.filter(
    (c) => c.value !== 'Personal'
  );

  return (
    <>
      <form className="task-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="task-input"
          placeholder="What do you need to do?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="task-input-actions">
          {isAddingCourse ? (
            <div className="course-input-wrapper">
              <input
                ref={courseInputRef}
                type="text"
                className="course-input"
                placeholder="Course name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                onBlur={handleAddCourse}
                onKeyDown={handleCourseInputKeyDown}
              />
            </div>
          ) : editingCourse ? (
            <div className="course-input-wrapper">
              <input
                ref={editInputRef}
                type="text"
                className="course-input"
                placeholder="Course name"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={confirmEdit}
                onKeyDown={handleEditKeyDown}
              />
            </div>
          ) : (
            <Dropdown
              variant="compact"
              value={selectedCourse}
              onChange={handleCourseChange}
              ariaLabel="Select course"
              renderItemSuffix={renderCourseSuffix}
              options={[
                { value: 'Personal', label: 'Personal' },
                ...courses.map((c) => ({
                  value: c,
                  label: getDisplayName(c),
                })),
                { value: '__add_new__', label: '+ Add course...' },
              ]}
            />
          )}
          <div className="date-picker-wrapper">
            <button
              ref={dateButtonRef}
              type="button"
              className={`date-picker-btn ${dueDate ? 'has-date' : ''}`}
              onClick={handleDateClick}
              aria-label="Set due date"
            >
              {dueDate ? (
                <span className="date-display">{formatDisplayDate(dueDate)}</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="calendar-icon">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <CalendarPicker
                  value={dueDate}
                  onChange={(date) => setDueDate(date)}
                  onClose={() => setShowDatePicker(false)}
                  triggerRef={dateButtonRef}
                />
              )}
            </AnimatePresence>
          </div>
          {dueDate && (
            <button
              type="button"
              className="clear-date-btn"
              onClick={() => setDueDate('')}
              aria-label="Clear due date"
            >
              ×
            </button>
          )}
          <button type="submit" className="btn-primary add-task-btn" disabled={!text.trim()}>
            Add
          </button>
        </div>
      </form>
      <AnimatePresence>
        {deletingCourse && (
          <DeleteCourseDialog
            displayName={getDisplayName(deletingCourse)}
            taskCount={deletingTaskCount}
            availableCourses={filteredAvailableCourses}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletingCourse(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
