import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useTaskStore } from './store/taskStore';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import { playCelebrationSound } from './utils/sounds';

function App() {
  const { tasks, syncing, error, syncCanvas, toggleComplete, addManualTask } = useTaskStore();
  const prevAllDone = useRef(false);

  // Filter state (local, doesn't need persistence)
  const [sourceFilter, setSourceFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync Canvas on mount (force on first load)
  useEffect(() => {
    syncCanvas(true);
  }, []);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Sort and filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Source filter
    if (sourceFilter !== 'all' && task.source !== sourceFilter) return false;
    // Hide completed filter
    if (hideCompleted && task.completed) return false;
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const courseMatch = task.courseName?.toLowerCase().includes(query);
      if (!titleMatch && !courseMatch) return false;
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
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

  function handleAddTask(text, dueDate) {
    addManualTask(text, dueDate);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">my checklist</h1>
        <button
          className={`sync-btn ${syncing ? 'syncing' : ''}`}
          onClick={() => syncCanvas(true)}
          disabled={syncing}
          aria-label="Sync with Canvas"
        >
          <svg viewBox="0 0 24 24" fill="none" className="sync-icon">
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>
      {syncing && <div className="sync-status">Syncing with Canvas...</div>}
      {error && <div className="sync-error">{error}</div>}
      <ProgressBar completedCount={completedCount} totalCount={totalCount} />
      <TaskInput onAddTask={handleAddTask} />
      <FilterBar
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <TaskList
        tasks={sortedTasks}
        onToggle={toggleComplete}
      />
    </div>
  );
}

export default App;
