import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useTaskStore } from './store/taskStore';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import FilterBar, { type SourceFilter } from './components/FilterBar';
import TaskList from './components/TaskList';
import { playCelebrationSound } from './utils/sounds';
import { isToday } from './utils/dateUtils';

function App() {
  const { tasks, syncing, error, syncCanvas, toggleComplete, addManualTask, customOrder, customCourses, addCustomCourse } = useTaskStore();
  const prevAllDone = useRef(false);

  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    syncCanvas(true);
  }, []);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const courses = useMemo(() => {
    const canvasCourses = tasks
      .filter(t => t.source === 'canvas' && t.courseName)
      .map(t => t.courseName);
    return [...new Set([...canvasCourses, ...customCourses])].sort();
  }, [tasks, customCourses]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (sourceFilter !== 'all' && task.source !== sourceFilter) return false;
      if (hideCompleted && task.completed) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const courseMatch = task.courseName?.toLowerCase().includes(query);
        if (!titleMatch && !courseMatch) return false;
      }
      return true;
    });
  }, [tasks, sourceFilter, hideCompleted, searchQuery]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);

      if (customOrder.length > 0) {
        const aIndex = customOrder.indexOf(a.id);
        const bIndex = customOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
      }

      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [filteredTasks, customOrder]);

  const { dueTodayTasks, otherTasks } = useMemo(() => {
    return {
      dueTodayTasks: sortedTasks.filter(t => isToday(t.dueDate)),
      otherTasks: sortedTasks.filter(t => !isToday(t.dueDate)),
    };
  }, [sortedTasks]);

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

  const handleAddTask = useCallback((text: string, dueDate: string | null, courseName: string) => {
    addManualTask(text, dueDate, courseName);
  }, [addManualTask]);

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
      <TaskInput onAddTask={handleAddTask} courses={courses} onAddCourse={addCustomCourse} />
      <FilterBar
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      {dueTodayTasks.length > 0 && (
        <section className="due-today-section">
          <h2 className="due-today-header">
            Due Today
            <span className="due-today-count">{dueTodayTasks.length}</span>
          </h2>
          <TaskList tasks={dueTodayTasks} onToggle={toggleComplete} />
        </section>
      )}
      {otherTasks.length > 0 && (
        <TaskList tasks={otherTasks} onToggle={toggleComplete} />
      )}
      {dueTodayTasks.length === 0 && otherTasks.length === 0 && (
        <TaskList tasks={[]} onToggle={toggleComplete} />
      )}
    </div>
  );
}

export default App;
