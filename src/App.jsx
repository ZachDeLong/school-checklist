import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useTaskStore } from './store/taskStore';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import { playCelebrationSound } from './utils/sounds';

function App() {
  const { tasks, syncing, error, syncCanvas, toggleComplete, addManualTask } = useTaskStore();
  const prevAllDone = useRef(false);

  // Sync Canvas on mount (force on first load)
  useEffect(() => {
    syncCanvas(true);
  }, []);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Sort tasks: incomplete first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed - b.completed;
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { x: 0.3, y: 0.6 },
        colors: ['#d4a456', '#e0b366', '#9b8aa6', '#7d9c73', '#a6867d'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { x: 0.7, y: 0.6 },
          colors: ['#d4a456', '#e0b366', '#9b8aa6', '#7d9c73', '#a6867d'],
        });
      }, 150);
      playCelebrationSound();
    }
    prevAllDone.current = allDone;
  }, [allDone]);

  function handleAddTask(text) {
    addManualTask(text, null);
  }

  return (
    <div className="app">
      <h1 className="app-title">my checklist</h1>
      {syncing && <div className="sync-status">Syncing with Canvas...</div>}
      {error && <div className="sync-error">{error}</div>}
      <ProgressBar completedCount={completedCount} totalCount={totalCount} />
      <TaskInput onAddTask={handleAddTask} />
      <TaskList
        tasks={sortedTasks}
        onToggle={toggleComplete}
      />
    </div>
  );
}

export default App;
