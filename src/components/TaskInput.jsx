import { useState } from 'react';
import './TaskInput.css';

export default function TaskInput({ onAddTask }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onAddTask(text.trim());
    setText('');
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
      <button type="submit" className="task-input-btn" disabled={!text.trim()}>
        Add
      </button>
    </form>
  );
}
