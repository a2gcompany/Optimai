'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  X,
  Bell,
  ListTodo,
  RefreshCw,
  Search,
  Calendar,
  FileUp,
} from 'lucide-react';
import { Sidebar } from '@/components';
import { PdfImporter } from '@/components/PdfImporter';

// ============================================================================
// TYPES
// ============================================================================

type ItemType = 'task' | 'reminder';
type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type ItemPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TaskReminder {
  id: string;
  title: string;
  description: string | null;
  type: ItemType;
  status: ItemStatus;
  priority: ItemPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  recurring: boolean;
  recurrence_rule: string | null;
  tags: string[];
  source: string;
}

interface Summary {
  total: number;
  tasks: number;
  reminders: number;
  pending: number;
  inProgress: number;
  completed: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const priorityLabels = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: X,
};

// ============================================================================
// API
// ============================================================================

async function fetchItems(params: Record<string, string> = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/tasks-reminders?${query}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function createItem(data: Partial<TaskReminder>) {
  const res = await fetch('/api/tasks-reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

async function updateItem(id: string, data: Partial<TaskReminder>) {
  const res = await fetch('/api/tasks-reminders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

async function deleteItem(id: string) {
  const res = await fetch(`/api/tasks-reminders?id=${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TasksPage() {
  const [items, setItems] = useState<TaskReminder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [tab, setTab] = useState<'all' | 'tasks' | 'reminders' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ItemPriority | ''>('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task' as ItemType,
    priority: 'medium' as ItemPriority,
    due_date: '',
    recurring: false,
  });

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // PDF Importer
  const [showPdfImporter, setShowPdfImporter] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const params: Record<string, string> = {};

      if (tab === 'tasks') params.type = 'task';
      if (tab === 'reminders') params.type = 'reminder';
      if (tab === 'completed') params.status = 'completed';
      if (tab !== 'completed') params.status = 'pending';
      if (search) params.search = search;
      if (priorityFilter) params.priority = priorityFilter;

      const data = await fetchItems(params);
      setItems(data.items || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search, priorityFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      await createItem({
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        priority: formData.priority,
        due_date: formData.due_date || null,
        recurring: formData.recurring,
      });

      setFormData({
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        due_date: '',
        recurring: false,
      });
      setShowForm(false);
      loadItems();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleToggleStatus = async (item: TaskReminder) => {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateItem(item.id, { status: newStatus });
    loadItems();
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    loadItems();
  };

  const handleEditStart = (item: TaskReminder) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleEditSave = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateItem(id, { title: editTitle });
    setEditingId(null);
    loadItems();
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Handle PDF import
  const handlePdfImport = async (importedTasks: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    dueTime?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    source: 'pdf_import';
    originalText: string;
    confidence: number;
  }>) => {
    // Create tasks one by one
    for (const task of importedTasks) {
      await createItem({
        title: task.title,
        description: task.originalText,
        type: 'task',
        priority: task.priority,
        due_date: task.dueDate || null,
      });
    }
    // Reload the list
    loadItems();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tareas y Recordatorios</h1>
            {summary && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {summary.pending} pendientes · {summary.tasks} tareas · {summary.reminders} recordatorios
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowPdfImporter(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileUp className="w-5 h-5" />
              Importar PDF
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'Todas', icon: ListTodo, count: summary?.total },
            { key: 'tasks', label: 'Tareas', icon: CheckCircle2, count: summary?.tasks },
            { key: 'reminders', label: 'Recordatorios', icon: Bell, count: summary?.reminders },
            { key: 'completed', label: 'Completadas', icon: CheckCircle2, count: summary?.completed },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && <span className="text-xs opacity-70">({count})</span>}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as ItemPriority | '')}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>

        {/* New Item Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ItemType })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="task">Tarea</option>
                  <option value="reminder">Recordatorio</option>
                </select>
              </div>
              <div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción (opcional)..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-4 items-center">
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as ItemPriority })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                {formData.type === 'reminder' && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={formData.recurring}
                      onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Recurrente
                  </label>
                )}
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
                  Crear
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Items List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No hay elementos {tab !== 'all' ? `en esta categoría` : ''}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const StatusIcon = statusIcons[item.status];
                const isEditing = editingId === item.id;

                return (
                  <li
                    key={item.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`mt-0.5 ${
                          item.status === 'completed'
                            ? 'text-green-500'
                            : 'text-gray-400 hover:text-primary-500'
                        }`}
                      >
                        <StatusIcon className="w-5 h-5" />
                      </button>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSave(item.id);
                                if (e.key === 'Escape') handleEditCancel();
                              }}
                              className="flex-1 px-2 py-1 border border-primary-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(item.id)}
                              className="text-green-500 hover:text-green-600"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <h3
                                onClick={() => handleEditStart(item)}
                                className={`font-medium cursor-pointer hover:text-primary-600 ${
                                  item.status === 'completed'
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                {item.title}
                              </h3>
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[item.priority]}`}
                              >
                                {priorityLabels[item.priority]}
                              </span>
                              {item.type === 'reminder' && (
                                <Bell className="w-3.5 h-3.5 text-purple-500" />
                              )}
                              {item.recurring && (
                                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                              {item.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.due_date).toLocaleDateString('es-ES')}
                                </span>
                              )}
                              {item.source !== 'manual' && (
                                <span className="text-blue-400">Importado</span>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <span className="flex items-center gap-1">
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* PDF Importer Modal */}
        {showPdfImporter && (
          <PdfImporter
            onImport={handlePdfImport}
            onClose={() => setShowPdfImporter(false)}
          />
        )}
      </main>
    </div>
  );
}
