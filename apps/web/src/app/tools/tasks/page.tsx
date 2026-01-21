'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, Circle, Clock, Star, AlertTriangle, Trash2,
  RefreshCw, Upload, Filter, ChevronDown, ChevronRight,
  Calendar, Tag, Sparkles, ArrowLeft, Plus
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface LocalTask {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  completed: boolean;
  completedDate?: string;
  list: string;
  tags: string[];
  aiSuggestion?: string;
  aiPriority?: number;
  source: 'local' | 'apple' | 'manual';
  createdAt: string;
  updatedAt: string;
}

interface TaskList {
  name: string;
  color: string;
  count: number;
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

const STORAGE_KEY = 'optimai_local_tasks';

function loadLocalTasks(): LocalTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: LocalTask[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ============================================================================
// APPLE REMINDERS IMPORT (via AppleScript)
// ============================================================================

async function importFromAppleReminders(): Promise<LocalTask[]> {
  // This would need to run via a local API endpoint that executes AppleScript
  // For now, we'll simulate with sample data
  const sampleTasks: LocalTask[] = [
    {
      id: 'apple-1',
      title: 'Revisar contrato A2G Talents',
      notes: 'Contrato con nuevo artista',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      priority: 'high',
      completed: false,
      list: 'Trabajo',
      tags: ['a2g', 'legal'],
      source: 'apple',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apple-2',
      title: 'Llamar a Roger Sanchez',
      notes: 'Confirmar fecha del evento',
      priority: 'medium',
      completed: false,
      list: 'A2G Talents',
      tags: ['artistas', 'eventos'],
      source: 'apple',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'apple-3',
      title: 'Review S-CORE analytics',
      notes: 'Dashboard mensual',
      dueDate: new Date(Date.now() + 172800000).toISOString(),
      priority: 'low',
      completed: false,
      list: 'S-CORE',
      tags: ['analytics', 'monthly'],
      source: 'apple',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return sampleTasks;
}

// ============================================================================
// AI ANALYSIS (simulated - would use Claude API)
// ============================================================================

function analyzeTasksWithAI(tasks: LocalTask[]): LocalTask[] {
  return tasks.map(task => {
    // Simulate AI analysis
    let aiPriority = 50;
    let aiSuggestion = '';

    // Priority keywords
    if (task.title.toLowerCase().includes('urgente') || task.priority === 'high') {
      aiPriority += 30;
      aiSuggestion = 'Alta prioridad detectada';
    }
    if (task.title.toLowerCase().includes('contrato') || task.title.toLowerCase().includes('legal')) {
      aiPriority += 20;
      aiSuggestion = 'Tarea legal - requiere atención';
    }
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
      if (daysUntilDue <= 1) {
        aiPriority += 25;
        aiSuggestion = 'Vence hoy o mañana';
      } else if (daysUntilDue <= 3) {
        aiPriority += 15;
        aiSuggestion = 'Vence pronto';
      }
    }
    if (task.tags.includes('a2g') || task.tags.includes('artistas')) {
      aiPriority += 10;
    }

    return {
      ...task,
      aiPriority: Math.min(100, aiPriority),
      aiSuggestion: aiSuggestion || 'Sin sugerencias',
    };
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TasksToolPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<LocalTask[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'ai'>('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Load tasks on mount
  useEffect(() => {
    const loaded = loadLocalTasks();
    if (loaded.length > 0) {
      const analyzed = analyzeTasksWithAI(loaded);
      setTasks(analyzed);
    }
  }, []);

  // Update filtered tasks and lists
  useEffect(() => {
    // Build lists
    const listMap = new Map<string, number>();
    tasks.forEach(t => {
      if (!t.completed || showCompleted) {
        listMap.set(t.list, (listMap.get(t.list) || 0) + 1);
      }
    });
    const newLists: TaskList[] = Array.from(listMap.entries()).map(([name, count]) => ({
      name,
      count,
      color: getListColor(name),
    }));
    setLists(newLists);

    // Filter and sort
    let filtered = tasks.filter(t => {
      if (!showCompleted && t.completed) return false;
      if (selectedList && t.list !== selectedList) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'ai') {
        return (b.aiPriority || 0) - (a.aiPriority || 0);
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, selectedList, showCompleted, sortBy]);

  // Get color for list
  function getListColor(name: string): string {
    const colors: Record<string, string> = {
      'Trabajo': '#3b82f6',
      'Personal': '#22c55e',
      'A2G Talents': '#f59e0b',
      'S-CORE': '#8b5cf6',
      'Nucleus': '#06b6d4',
    };
    return colors[name] || '#64748b';
  }

  // Import from Apple Reminders
  const handleImport = useCallback(async () => {
    setIsImporting(true);
    try {
      const imported = await importFromAppleReminders();
      const analyzed = analyzeTasksWithAI(imported);

      // Merge with existing tasks (avoid duplicates)
      const existingIds = new Set(tasks.map(t => t.id));
      const newTasks = analyzed.filter(t => !existingIds.has(t.id));
      const merged = [...tasks, ...newTasks];

      setTasks(merged);
      saveLocalTasks(merged);
    } catch (error) {
      console.error('Error importing:', error);
    }
    setIsImporting(false);
  }, [tasks]);

  // Toggle task completion
  const toggleTask = useCallback((id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          completed: !t.completed,
          completedDate: !t.completed ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setTasks(updated);
    saveLocalTasks(updated);
  }, [tasks]);

  // Delete task
  const deleteTask = useCallback((id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveLocalTasks(updated);
  }, [tasks]);

  // Add new task
  const addTask = useCallback((title: string) => {
    const newTask: LocalTask = {
      id: `manual-${Date.now()}`,
      title,
      priority: 'none',
      completed: false,
      list: selectedList || 'Personal',
      tags: [],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const analyzed = analyzeTasksWithAI([...tasks, newTask]);
    setTasks(analyzed);
    saveLocalTasks(analyzed);
  }, [tasks, selectedList]);

  // Re-analyze with AI
  const reanalyze = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const analyzed = analyzeTasksWithAI(tasks);
      setTasks(analyzed);
      saveLocalTasks(analyzed);
      setIsLoading(false);
    }, 500);
  }, [tasks]);

  // Priority badge
  const PriorityBadge = ({ priority }: { priority: LocalTask['priority'] }) => {
    const colors = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      low: 'bg-blue-500/20 text-blue-400',
      none: 'bg-slate-500/20 text-slate-400',
    };
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja', none: '-' };
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/world')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Tool: Tareas</h1>
              <p className="text-sm text-slate-400">Gestión local de tareas con análisis AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reanalyze}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Analizar con AI
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${isImporting ? 'animate-bounce' : ''}`} />
              Importar Apple
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Lists */}
        <aside className="w-64 bg-slate-800/50 border-r border-slate-700 p-4 min-h-[calc(100vh-73px)]">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Listas</h2>
            <button
              onClick={() => setSelectedList(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedList === null ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
              }`}
            >
              Todas ({tasks.filter(t => !t.completed || showCompleted).length})
            </button>
            {lists.map(list => (
              <button
                key={list.name}
                onClick={() => setSelectedList(list.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  selectedList === list.name ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }} />
                <span className="flex-1">{list.name}</span>
                <span className="text-slate-500 text-sm">{list.count}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Filtros</h2>
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-slate-600"
              />
              <span className="text-sm">Mostrar completadas</span>
            </label>
          </div>

          <div className="border-t border-slate-700 pt-4 mt-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Ordenar por</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'ai')}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="ai">Prioridad AI</option>
              <option value="priority">Prioridad manual</option>
              <option value="date">Fecha límite</option>
            </select>
          </div>

          {/* AI Summary */}
          <div className="border-t border-slate-700 pt-4 mt-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Resumen AI</h2>
            <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>{filteredTasks.filter(t => (t.aiPriority || 0) > 70).length} urgentes</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Clock className="w-4 h-4" />
                <span>{filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date(Date.now() + 259200000)).length} próximas a vencer</span>
              </div>
              <p className="text-slate-400 text-xs mt-2">
                Sugerencia: Comienza por las tareas con mayor puntuación AI
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Quick Add */}
          <div className="mb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem('newTask') as HTMLInputElement;
                if (input.value.trim()) {
                  addTask(input.value.trim());
                  input.value = '';
                }
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                name="newTask"
                placeholder="Añadir nueva tarea..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay tareas pendientes</p>
                <p className="text-sm">Importa desde Apple Reminders o añade una nueva</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden transition-all ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-500 hover:text-cyan-400" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${task.completed ? 'line-through text-slate-500' : ''}`}>
                          {task.title}
                        </h3>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      {task.notes && (
                        <p className="text-sm text-slate-400 truncate">{task.notes}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1" style={{ color: getListColor(task.list) }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getListColor(task.list) }} />
                          {task.list}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString('es-ES')}
                          </span>
                        )}
                        {task.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {task.tags.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Score */}
                    <div className="shrink-0 text-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        (task.aiPriority || 0) > 70 ? 'bg-red-500/20 text-red-400' :
                        (task.aiPriority || 0) > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {task.aiPriority || 0}
                      </div>
                      <span className="text-xs text-slate-500">AI</span>
                    </div>

                    {/* Expand/Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        {expandedTask === task.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedTask === task.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-700 mt-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Fuente:</span>
                          <span className="ml-2 capitalize">{task.source}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Creada:</span>
                          <span className="ml-2">{new Date(task.createdAt).toLocaleString('es-ES')}</span>
                        </div>
                        {task.aiSuggestion && (
                          <div className="col-span-2 bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-violet-400 mb-1">
                              <Sparkles className="w-4 h-4" />
                              <span className="font-medium">Sugerencia AI</span>
                            </div>
                            <p className="text-slate-300">{task.aiSuggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
