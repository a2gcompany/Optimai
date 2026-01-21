'use client';

import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import type { Task } from '@/lib/api';

interface TaskListProps {
  tasks: Task[];
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: AlertCircle,
};

const statusColors = {
  pending: 'text-gray-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  cancelled: 'text-red-500',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No hay tareas recientes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const StatusIcon = statusIcons[task.status];
        return (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusColors[task.status]}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                {task.title}
              </p>
              {task.due_date && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
              {task.priority}
            </span>
          </div>
        );
      })}
    </div>
  );
}
