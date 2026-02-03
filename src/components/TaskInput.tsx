import { useState, useRef } from 'react';
import { formatDisplayDate } from '../utils/dateUtils';
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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const courseInputRef = useRef<HTMLInputElement>(null);

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
    if (!showDatePicker) {
      if (!dueDate) {
        setDueDate(new Date().toISOString().split('T')[0]);
      }
      setTimeout(() => dateInputRef.current?.showPicker?.(), 0);
    }
  }

  function handleCourseChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
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

  return (
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
        ) : (
          <select
            className="course-selector"
            value={selectedCourse}
            onChange={handleCourseChange}
            aria-label="Select course"
          >
            <option value="Personal">Personal</option>
            {courses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
            <option value="__add_new__">+ Add course...</option>
          </select>
        )}
        <button
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
        <input
          ref={dateInputRef}
          type="date"
          className="date-input-hidden"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
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
        <button type="submit" className="task-input-btn" disabled={!text.trim()}>
          Add
        </button>
      </div>
    </form>
  );
}
