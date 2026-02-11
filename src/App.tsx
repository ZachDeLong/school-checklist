import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { useTaskStore } from './store/taskStore';
import { useSettingsStore } from './store/settingsStore';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import FilterBar from './components/FilterBar';
import TaskList from './components/TaskList';
import SettingsModal from './components/SettingsModal';
import { playCelebrationSound } from './utils/sounds';
import { isWithinDays } from './utils/dateUtils';

function App() {
  const { tasks, syncing, error, syncCanvas, toggleComplete, addManualTask, customOrder, customCourses, addCustomCourse, courseAliases } = useTaskStore();
  const isConfigured = useSettingsStore((state) => state.isConfigured());
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const timeframeDays = useSettingsStore((state) => state.timeframeDays);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const confettiEnabled = useSettingsStore((state) => state.confettiEnabled);
  const prevAllDone = useRef(false);

  const [courseFilter, setCourseFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (isConfigured) {
      syncCanvas(true);
    }
  }, [isConfigured, syncCanvas]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const courses = useMemo(() => {
    const canvasCourses = tasks
      .filter(t => t.source === 'canvas' && t.courseName)
      .map(t => t.courseName);
    return [...new Set([...canvasCourses, ...customCourses])].sort();
  }, [tasks, customCourses]);

  const filterCourses = useMemo(() => {
    return courses
      .filter(c => c !== 'Personal')
      .map(c => ({ value: c, label: courseAliases[c] || c }));
  }, [courses, courseAliases]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (courseFilter === 'personal') {
        if (task.courseName !== 'Personal') return false;
      } else if (courseFilter === 'school') {
        if (task.courseName === 'Personal') return false;
      } else if (courseFilter !== 'all') {
        if (task.courseName !== courseFilter) return false;
      }
      if (hideCompleted && task.completed) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const courseMatch = task.courseName?.toLowerCase().includes(query);
        if (!titleMatch && !courseMatch) return false;
      }
      return true;
    });
  }, [tasks, courseFilter, hideCompleted, searchQuery]);

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

  const { upcomingTasks, otherTasks } = useMemo(() => {
    return {
      upcomingTasks: sortedTasks.filter(t => isWithinDays(t.dueDate, timeframeDays)),
      otherTasks: sortedTasks.filter(t => !isWithinDays(t.dueDate, timeframeDays)),
    };
  }, [sortedTasks, timeframeDays]);

  const upcomingLabel = timeframeDays === 1 ? 'Due Today' : `Next ${timeframeDays} Days`;

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      if (confettiEnabled) {
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
      }
      if (soundEnabled) {
        playCelebrationSound();
      }
    }
    prevAllDone.current = allDone;
  }, [allDone, confettiEnabled, soundEnabled]);

  const handleAddTask = useCallback((text: string, dueDate: string | null, courseName: string) => {
    addManualTask(text, dueDate, courseName);
  }, [addManualTask]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">my checklist</h1>
        <div className="header-actions">
          <button
            className={`sync-btn ${syncing ? 'syncing' : ''}`}
            onClick={() => syncCanvas(true)}
            disabled={syncing || !isConfigured}
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
          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.svg
                  key="sun"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="theme-icon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </motion.svg>
              ) : (
                <motion.svg
                  key="moon"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="theme-icon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
          <button
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" className="settings-icon">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>
      {!isConfigured && (
        <div className="setup-prompt" onClick={() => setSettingsOpen(true)}>
          <span className="setup-prompt-icon">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
          <span>Configure Canvas to sync your assignments</span>
        </div>
      )}
      {syncing && <div className="sync-status">Syncing with Canvas...</div>}
      {error && <div className="sync-error">{error}</div>}
      <ProgressBar completedCount={completedCount} totalCount={totalCount} />
      <TaskInput onAddTask={handleAddTask} courses={courses} onAddCourse={addCustomCourse} />
      <FilterBar
        courseFilter={courseFilter}
        setCourseFilter={setCourseFilter}
        courses={filterCourses}
        hideCompleted={hideCompleted}
        setHideCompleted={setHideCompleted}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <AnimatePresence>
        {upcomingTasks.length > 0 && (
          <motion.section
            className="due-today-section"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <h2 className="due-today-header">
              {upcomingLabel}
              <span className="due-today-count">{upcomingTasks.length}</span>
            </h2>
            <TaskList tasks={upcomingTasks} onToggle={toggleComplete} />
          </motion.section>
        )}
      </AnimatePresence>
      {otherTasks.length > 0 && (
        <TaskList tasks={otherTasks} onToggle={toggleComplete} />
      )}
      {upcomingTasks.length === 0 && otherTasks.length === 0 && (
        <TaskList tasks={[]} onToggle={toggleComplete} />
      )}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
