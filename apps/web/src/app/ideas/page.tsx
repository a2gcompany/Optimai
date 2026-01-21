'use client';

import { useEffect, useState } from 'react';
import { Plus, Lightbulb, Bug, Sparkles, Search, ChevronUp, ChevronDown, Trash2, GripVertical, X } from 'lucide-react';
import { Sidebar } from '@/components';
import { api, Idea } from '@/lib/api';

const statusColumns = [
  { id: 'backlog', label: 'Backlog', color: 'bg-gray-100 dark:bg-gray-700' },
  { id: 'evaluating', label: 'Evaluando', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'planned', label: 'Planificado', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'in_progress', label: 'En Progreso', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'done', label: 'Hecho', color: 'bg-green-100 dark:bg-green-900/30' },
] as const;

const categoryIcons = {
  feature: Sparkles,
  improvement: Lightbulb,
  bugfix: Bug,
  research: Search,
  other: Lightbulb,
};

const categoryColors = {
  feature: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  improvement: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bugfix: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  research: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const effortLabels = { xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' };
const impactColors = {
  low: 'bg-gray-200 dark:bg-gray-600',
  medium: 'bg-yellow-200 dark:bg-yellow-700',
  high: 'bg-orange-200 dark:bg-orange-700',
  critical: 'bg-red-200 dark:bg-red-700',
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    category: 'feature' as Idea['category'],
    effort: 'm' as Idea['effort'],
    impact: 'medium' as Idea['impact'],
    tags: '',
  });

  useEffect(() => {
    loadIdeas();
  }, []);

  async function loadIdeas() {
    setLoading(true);
    const data = await api.getIdeas(100);
    setIdeas(data);
    setLoading(false);
  }

  async function handleCreateIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!newIdea.title.trim()) return;

    await api.createIdea({
      title: newIdea.title,
      description: newIdea.description || undefined,
      category: newIdea.category,
      status: 'backlog',
      priority: 0,
      effort: newIdea.effort,
      impact: newIdea.impact,
      tags: newIdea.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setNewIdea({ title: '', description: '', category: 'feature', effort: 'm', impact: 'medium', tags: '' });
    setShowForm(false);
    loadIdeas();
  }

  async function handleUpdateStatus(id: string, status: Idea['status']) {
    await api.updateIdea(id, { status });
    loadIdeas();
  }

  async function handleVote(id: string, delta: number) {
    await api.voteIdea(id, delta);
    loadIdeas();
  }

  async function handleDelete(id: string) {
    await api.deleteIdea(id);
    loadIdeas();
  }

  function getIdeasByStatus(status: Idea['status']) {
    return ideas.filter((i) => i.status === status).sort((a, b) => b.votes - a.votes);
  }

  function IdeaCard({ idea }: { idea: Idea }) {
    const CategoryIcon = categoryIcons[idea.category];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-2 group">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <button onClick={() => handleVote(idea.id, 1)} className="hover:text-primary-500">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">{idea.votes}</span>
            <button onClick={() => handleVote(idea.id, -1)} className="hover:text-primary-500">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${categoryColors[idea.category]}`}>
                <CategoryIcon className="w-3 h-3" />
                {idea.category}
              </span>
              {idea.impact && (
                <span className={`px-1.5 py-0.5 text-xs rounded ${impactColors[idea.impact]} text-gray-700 dark:text-gray-200`}>
                  {idea.impact}
                </span>
              )}
              {idea.effort && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {effortLabels[idea.effort]}
                </span>
              )}
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{idea.title}</h4>
            {idea.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{idea.description}</p>
            )}
            {idea.tags && idea.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {idea.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleDelete(idea.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ideas Canvas</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {ideas.length} ideas en total, {ideas.filter((i) => i.status === 'in_progress').length} en progreso
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                Lista
              </button>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Idea
            </button>
          </div>
        </div>

        {/* New Idea Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Idea</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateIdea} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={newIdea.title}
                    onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                    placeholder="Título de la idea..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
                <div>
                  <textarea
                    value={newIdea.description}
                    onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                    placeholder="Descripción (opcional)..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
                    <select
                      value={newIdea.category}
                      onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value as Idea['category'] })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="feature">Feature</option>
                      <option value="improvement">Mejora</option>
                      <option value="bugfix">Bugfix</option>
                      <option value="research">Research</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Esfuerzo</label>
                    <select
                      value={newIdea.effort}
                      onChange={(e) => setNewIdea({ ...newIdea, effort: e.target.value as Idea['effort'] })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="xs">XS (horas)</option>
                      <option value="s">S (1-2 días)</option>
                      <option value="m">M (3-5 días)</option>
                      <option value="l">L (1-2 semanas)</option>
                      <option value="xl">XL (2+ semanas)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">Impacto</label>
                    <select
                      value={newIdea.impact}
                      onChange={(e) => setNewIdea({ ...newIdea, impact: e.target.value as Idea['impact'] })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Bajo</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                      <option value="critical">Crítico</option>
                    </select>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={newIdea.tags}
                    onChange={(e) => setNewIdea({ ...newIdea, tags: e.target.value })}
                    placeholder="Tags (separados por comas)..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
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
                    Crear Idea
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {viewMode === 'kanban' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusColumns.map((column) => {
              const columnIdeas = getIdeasByStatus(column.id);
              return (
                <div key={column.id} className="flex-shrink-0 w-72">
                  <div className={`rounded-t-lg px-3 py-2 ${column.color}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{column.label}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{columnIdeas.length}</span>
                    </div>
                  </div>
                  <div className={`rounded-b-lg min-h-[400px] p-2 ${column.color.replace('100', '50').replace('900/30', '800/20')}`}>
                    {loading ? (
                      <div className="text-center text-gray-400 py-4">Cargando...</div>
                    ) : columnIdeas.length === 0 ? (
                      <div className="text-center text-gray-400 py-4 text-sm">Sin ideas</div>
                    ) : (
                      columnIdeas.map((idea) => (
                        <div
                          key={idea.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('ideaId', idea.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('ideaId');
                            if (draggedId && draggedId !== idea.id) {
                              handleUpdateStatus(draggedId, column.id);
                            }
                          }}
                        >
                          <IdeaCard idea={idea} />
                        </div>
                      ))
                    )}
                    <div
                      className="h-16 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('ideaId');
                        if (draggedId) {
                          handleUpdateStatus(draggedId, column.id);
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando ideas...</div>
            ) : ideas.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay ideas</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Votos</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Idea</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Impacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Esfuerzo</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ideas.map((idea) => {
                    const CategoryIcon = categoryIcons[idea.category];
                    return (
                      <tr key={idea.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleVote(idea.id, 1)} className="text-gray-400 hover:text-primary-500">
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-gray-900 dark:text-white w-6 text-center">{idea.votes}</span>
                            <button onClick={() => handleVote(idea.id, -1)} className="text-gray-400 hover:text-primary-500">
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{idea.title}</p>
                            {idea.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{idea.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full w-fit ${categoryColors[idea.category]}`}>
                            <CategoryIcon className="w-3 h-3" />
                            {idea.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={idea.status}
                            onChange={(e) => handleUpdateStatus(idea.id, e.target.value as Idea['status'])}
                            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {statusColumns.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                            <option value="rejected">Rechazado</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {idea.impact && (
                            <span className={`px-2 py-1 text-xs rounded ${impactColors[idea.impact]} text-gray-700 dark:text-gray-200`}>
                              {idea.impact}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {idea.effort && (
                            <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {effortLabels[idea.effort]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(idea.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
