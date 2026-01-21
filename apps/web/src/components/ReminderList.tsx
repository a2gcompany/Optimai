'use client';

import { Bell, CheckCircle, Star } from 'lucide-react';
import type { Reminder } from '@/lib/api';

interface ReminderListProps {
  reminders: Reminder[];
}

export function ReminderList({ reminders }: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No hay recordatorios pendientes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => {
        const isCompleted = reminder.is_completed;
        const priority = reminder.priority || 0;
        const isHighPriority = priority >= 3;

        return (
          <div
            key={reminder.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              isCompleted
                ? 'bg-green-50 dark:bg-green-900/20'
                : isHighPriority
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <div
              className={`p-2 rounded-full ${
                isCompleted
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : isHighPriority
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : isHighPriority ? (
                <Star className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-medium truncate ${
                  isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                }`}
              >
                {reminder.title || reminder.message}
              </p>
              <div className="flex items-center gap-2">
                {reminder.list_name && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{reminder.list_name}</span>
                )}
                {priority > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      priority >= 4
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : priority >= 2
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    P{priority}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
