import { AnimatePresence } from 'motion/react';
import TaskItem from './TaskItem';
import './TaskList.css';

export default function TaskList({ tasks, onToggle, onDelete, onEdit }) {
  return (
    <div className="task-list">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
