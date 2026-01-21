'use client';

import { useEffect, useState } from 'react';
import { Plus, Bell, Clock, CheckCircle2, Trash2, Calendar, Star } from 'lucide-react';
import { Sidebar } from '@/components';
import { api, Reminder } from '@/lib/api';

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    priority: 0,
  });

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    setLoading(true);
    const data = await api.getAllReminders(100);
    setReminders(data);
    setLoading(false);
  }

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!newReminder.title.trim()) return;

    await api.createReminder({
      title: newReminder.title,
      priority: newReminder.priority,
    });

    setNewReminder({ title: '', priority: 0 });
    setShowForm(false);
    loadReminders();
  }

  async function handleToggleComplete(reminder: Reminder) {
    await api.updateReminder(reminder.id, {
      is_completed: !reminder.is_completed,
    });
    loadReminders();
  }

  async function handleDeleteReminder(id: string) {
    await api.deleteReminder(id);
    loadReminders();
  }

  async function handleSetPriority(id: string, priority: number) {
    await api.updateReminder(id, { priority });
    loadReminders();
  }

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !r.is_completed;
    return r.is_completed;
  });

  // Group by list_name
  const groupedReminders = filteredReminders.reduce(
    (acc, r) => {
      const list = r.list_name || 'Sin lista';
      if (!acc[list]) acc[list] = [];
      acc[list].push(r);
      return acc;
    },
    {} as Record<string, Reminder[]>
  );

  const stats = {
    total: reminders.length,
    pending: reminders.filter((r) => !r.is_completed).length,
    completed: reminders.filter((r) => r.is_completed).length,
    highPriority: reminders.filter((r) => !r.is_completed && r.priority >= 3).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recordatorios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {stats.pending} pendientes, {stats.highPriority} prioritarios
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Recordatorio
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Star className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Prioritarios</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completados</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'pending' ? 'Pendientes' : f === 'completed' ? 'Completados' : 'Todos'}
            </button>
          ))}
        </div>

        {/* New Reminder Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <form onSubmit={handleCreateReminder} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  placeholder="Recordatorio..."
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Prioridad:</span>
                  {[0, 1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewReminder({ ...newReminder, priority: p })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        newReminder.priority === p
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Crear Recordatorio
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reminders List grouped by list_name */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            Cargando recordatorios...
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            No hay recordatorios {filter === 'pending' ? 'pendientes' : filter === 'completed' ? 'completados' : ''}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReminders).map(([listName, listReminders]) => (
              <div key={listName} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{listName}</h2>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {listReminders
                    .sort((a, b) => b.priority - a.priority)
                    .map((reminder) => (
                      <li key={reminder.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleToggleComplete(reminder)}
                            className={`mt-0.5 ${reminder.is_completed ? 'text-green-500' : 'text-gray-400 hover:text-primary-500'}`}
                          >
                            {reminder.is_completed ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Bell className="w-5 h-5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium ${reminder.is_completed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                              {reminder.title}
                            </p>
                            {reminder.due_date && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Vence: {new Date(reminder.due_date).toLocaleDateString('es-ES')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Priority selector */}
                            <div className="flex gap-1">
                              {[0, 1, 2, 3, 4, 5].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => handleSetPriority(reminder.id, p)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                                    reminder.priority === p
                                      ? p >= 4
                                        ? 'bg-red-500 text-white'
                                        : p >= 2
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-gray-400 text-white'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleDeleteReminder(reminder.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
