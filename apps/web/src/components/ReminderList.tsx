'use client';

import { Bell, CheckCircle } from 'lucide-react';
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      return 'Vencido';
    } else if (hours < 1) {
      return `En ${minutes} min`;
    } else if (hours < 24) {
      return `En ${hours}h ${minutes}min`;
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => {
        const isSent = !!reminder.sent_at;
        return (
          <div
            key={reminder.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${isSent ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}
          >
            <div className={`p-2 rounded-full ${isSent ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
              {isSent ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {reminder.message}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSent ? 'Enviado' : formatDate(reminder.scheduled_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
