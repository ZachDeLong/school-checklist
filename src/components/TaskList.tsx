import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AnimatePresence } from 'motion/react';
import { useTaskStore } from '../store/taskStore';
import SortableTaskItem from './SortableTaskItem';
import TaskItem from './TaskItem';
import type { Task } from '../schemas/task';
import './TaskList.css';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
}

export default function TaskList({ tasks, onToggle }: TaskListProps) {
  const { reorderTasks } = useTaskStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderTasks(active.id as string, over.id as string);
    }
    setActiveId(null);
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTask ? (
          <div className="drag-overlay-item">
            <TaskItem task={activeTask} onToggle={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
