import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { playCheckSound, playUncheckSound } from '../utils/sounds';
import './TaskItem.css';

export default function TaskItem({ task, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleToggle() {
    if (editing) return;
    if (!task.completed) {
      playCheckSound();
    } else {
      playUncheckSound();
    }
    onToggle(task.id);
  }

  function handleTextClick() {
    if (task.completed) return;
    setEditText(task.text);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== task.text) {
      onEdit(task.id, trimmed);
    }
    setEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setEditing(false);
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

      {editing ? (
        <input
          ref={inputRef}
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div className="task-text-wrapper" onClick={handleTextClick}>
          <span className={`task-text ${task.completed ? 'completed' : ''}`}>
            {task.text}
          </span>
          <motion.span
            className="strikethrough-line"
            initial={false}
            animate={{ scaleX: task.completed ? 1 : 0 }}
            transition={{ duration: 0.2, delay: task.completed ? 0.05 : 0 }}
          />
        </div>
      )}

      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Delete task">
        &times;
      </button>
    </motion.div>
  );
}
