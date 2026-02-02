import { useState, useRef } from 'react';
import './TaskInput.css';

export default function TaskInput({ onAddTask }) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onAddTask(text.trim(), dueDate || null);
    setText('');
    setDueDate('');
    setShowDatePicker(false);
  }

  function handleDateClick() {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker) {
      setTimeout(() => dateInputRef.current?.showPicker?.(), 0);
    }
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
