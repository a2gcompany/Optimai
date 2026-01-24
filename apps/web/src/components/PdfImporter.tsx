'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  X,
  Check,
  AlertCircle,
  Trash2,
  Calendar,
  Clock,
  Flag,
  Loader2,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ImportedTask {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'pdf_import';
  originalText: string;
  confidence: number;
}

interface PdfImporterProps {
  onImport: (tasks: ImportedTask[]) => Promise<void>;
  onClose: () => void;
}

// -----------------------------------------------------------------------------
// Priority Badge Component
// -----------------------------------------------------------------------------

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  medium: { label: 'Media', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export function PdfImporter({ onImport, onClose }: PdfImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ImportedTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  // Process uploaded file
  const processFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Por favor selecciona un archivo PDF');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tasks/import-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar el PDF');
      }

      setTasks(data.tasks);
      // Select all tasks by default
      setSelectedTasks(new Set(data.tasks.map((_: ImportedTask, i: number) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle task selection
  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  // Toggle all tasks
  const toggleAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((_, i) => i)));
    }
  };

  // Remove a task from the list
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
    const newSelected = new Set(selectedTasks);
    newSelected.delete(index);
    // Adjust indices
    const adjusted = new Set<number>();
    newSelected.forEach(i => {
      if (i > index) adjusted.add(i - 1);
      else adjusted.add(i);
    });
    setSelectedTasks(adjusted);
  };

  // Update task priority
  const updatePriority = (index: number, priority: ImportedTask['priority']) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], priority };
    setTasks(newTasks);
  };

  // Import selected tasks
  const handleImport = async () => {
    const tasksToImport = tasks.filter((_, i) => selectedTasks.has(i));
    if (tasksToImport.length === 0) return;

    setIsLoading(true);
    try {
      await onImport(tasksToImport);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar tareas');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setTasks([]);
    setSelectedTasks(new Set());
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Importar Tareas desde PDF
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tasks.length === 0 ? (
            // Upload Area
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">Procesando PDF...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Arrastra un PDF aquí o{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                    >
                      selecciona un archivo
                    </button>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    PDF con recordatorios, listas de tareas o agendas
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </>
              )}
            </div>
          ) : (
            // Tasks Preview
            <div className="space-y-4">
              {/* File info and actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                  <span>{fileName}</span>
                  <span className="text-gray-400">•</span>
                  <span>{tasks.length} tareas detectadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAll}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    {selectedTasks.size === tasks.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    Cambiar archivo
                  </button>
                </div>
              </div>

              {/* Tasks list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedTasks.has(index)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(index)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                          selectedTasks.has(index)
                            ? 'bg-primary-500 border-primary-500 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {selectedTasks.has(index) && <Check className="w-3 h-3" />}
                      </button>

                      {/* Task details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(task.dueDate).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          {task.dueTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.dueTime}
                            </span>
                          )}
                          <span className="text-gray-400">
                            {Math.round(task.confidence * 100)}% confianza
                          </span>
                        </div>
                      </div>

                      {/* Priority selector */}
                      <select
                        value={task.priority}
                        onChange={(e) => updatePriority(index, e.target.value as ImportedTask['priority'])}
                        className={`text-xs px-2 py-1 rounded ${priorityConfig[task.priority].color} border-0 cursor-pointer`}
                      >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>

                      {/* Remove button */}
                      <button
                        onClick={() => removeTask(index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {tasks.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedTasks.size} de {tasks.length} tareas seleccionadas
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={selectedTasks.size === 0 || isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Importar {selectedTasks.size} tareas
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
