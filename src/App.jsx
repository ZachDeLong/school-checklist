import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import ProgressBar from './components/ProgressBar';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import { playCelebrationSound } from './utils/sounds';

function loadTasks() {
  try {
    const saved = localStorage.getItem('checklist-tasks');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => a.completed - b.completed);
}

function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [displayOrder, setDisplayOrder] = useState(() => sortTasks(tasks).map((t) => t.id));
  const nextId = useRef(
    tasks.reduce((max, t) => {
      const num = parseInt(t.id.replace('task-', ''), 10);
      return num >= max ? num + 1 : max;
    }, 0)
  );
  const prevAllDone = useRef(false);
  const sortTimerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('checklist-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  // Build the display list: tasks in displayOrder, with current data
  const displayTasks = displayOrder
    .map((id) => tasks.find((t) => t.id === id))
    .filter(Boolean)
    .concat(tasks.filter((t) => !displayOrder.includes(t.id)));

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

  function addTask(text) {
    const id = `task-${nextId.current++}`;
    setTasks((prev) => [...prev, { id, text, completed: false }]);
    setDisplayOrder((prev) => {
      const firstCompletedIdx = prev.findIndex((oid) =>
        tasks.find((t) => t.id === oid)?.completed
      );
      if (firstCompletedIdx === -1) return [...prev, id];
      return [...prev.slice(0, firstCompletedIdx), id, ...prev.slice(firstCompletedIdx)];
    });
  }

  function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    const isCompleting = task && !task.completed;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );

    if (isCompleting) {
      // Delay the re-sort so the item stays in place while it fades
      clearTimeout(sortTimerRef.current);
      sortTimerRef.current = setTimeout(() => {
        setDisplayOrder(
          sortTasks(
            tasks.map((t) => (t.id === id ? { ...t, completed: true } : t))
          ).map((t) => t.id)
        );
      }, 800);
    } else {
      // Unchecking: re-sort immediately
      setDisplayOrder(
        sortTasks(
          tasks.map((t) => (t.id === id ? { ...t, completed: false } : t))
        ).map((t) => t.id)
      );
    }
  }

  function editTask(id, newText) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: newText } : t))
    );
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDisplayOrder((prev) => prev.filter((oid) => oid !== id));
  }

  return (
    <div className="app">
      <h1 className="app-title">my checklist</h1>
      <ProgressBar completedCount={completedCount} totalCount={totalCount} />
      <TaskInput onAddTask={addTask} />
      <TaskList
        tasks={displayTasks}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onEdit={editTask}
      />
    </div>
  );
}

export default App;
