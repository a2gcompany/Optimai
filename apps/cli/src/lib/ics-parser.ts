import ICAL from 'ical.js';
import { readFileSync } from 'fs';
import type { Task } from './types.js';

// Map ICS PRIORITY (1-4=high, 5=medium, 6-9=low) to our priority
function mapPriority(priority: number | undefined): Task['priority'] {
  if (!priority || priority === 0) return 'medium';
  if (priority >= 1 && priority <= 4) return 'high';
  if (priority === 5) return 'medium';
  return 'low';
}

// Map ICS STATUS to our status
function mapStatus(status: string | undefined): Task['status'] {
  if (!status) return 'pending';
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'IN-PROCESS':
      return 'in_progress';
    default:
      return 'pending';
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function parseICSFile(filePath: string): Task[] {
  const content = readFileSync(filePath, 'utf-8');
  return parseICSContent(content);
}

export function parseICSContent(content: string): Task[] {
  const tasks: Task[] = [];

  try {
    const jcalData = ICAL.parse(content);
    const comp = new ICAL.Component(jcalData);

    // Get all VTODO components
    const vtodos = comp.getAllSubcomponents('vtodo');

    for (const vtodo of vtodos) {
      const summary = vtodo.getFirstPropertyValue('summary') as string;
      if (!summary) continue;

      const description = vtodo.getFirstPropertyValue('description') as string | null;
      const priority = vtodo.getFirstPropertyValue('priority') as number | undefined;
      const status = vtodo.getFirstPropertyValue('status') as string | undefined;
      const due = vtodo.getFirstPropertyValue('due') as ICAL.Time | null;
      const uid = vtodo.getFirstPropertyValue('uid') as string | null;

      const task: Task = {
        id: uid || generateId(),
        title: summary,
        description: description || null,
        type: 'task',
        status: mapStatus(status),
        priority: mapPriority(priority),
        due_date: due ? due.toJSDate().toISOString() : null,
        tags: [],
        source: 'apple_reminders',
        created_at: new Date().toISOString(),
      };

      // Try to get categories/tags
      const categories = vtodo.getFirstPropertyValue('categories');
      if (categories) {
        if (Array.isArray(categories)) {
          task.tags = categories.map(String);
        } else {
          task.tags = [String(categories)];
        }
      }

      tasks.push(task);
    }
  } catch (error) {
    console.error('Error parsing ICS file:', error);
  }

  return tasks;
}
