import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskItem from './TaskItem';
import './SortableTaskItem.css';

export default function SortableTaskItem({ task, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-task-item ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <TaskItem task={task} onToggle={onToggle} />
    </div>
  );
}
