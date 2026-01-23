import express from 'express';
import type { Express, Request, Response } from 'express';
import {
  getTasks,
  saveTasks,
  getTransactions,
  saveTransactions,
  getConfig,
  OPTIMAI_DIR,
} from './storage.js';
import { generateId } from './ics-parser.js';
import type { Task, Transaction } from './types.js';

export function createLocalAPI(port: number): Express {
  const app = express();

  app.use(express.json());

  // CORS for local development
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', dataDir: OPTIMAI_DIR });
  });

  // ============= TASKS =============

  app.get('/api/tasks', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = getTasks();
    const sorted = data.tasks.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json(sorted.slice(0, limit));
  });

  app.get('/api/tasks/stats', (_req: Request, res: Response) => {
    const data = getTasks();
    const now = new Date();
    const stats = {
      total: data.tasks.length,
      pending: data.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
      completed: data.tasks.filter((t) => t.status === 'completed').length,
      overdue: data.tasks.filter((t) => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < now;
      }).length,
    };
    res.json(stats);
  });

  app.post('/api/tasks', (req: Request, res: Response) => {
    const data = getTasks();
    const task: Task = {
      id: generateId(),
      title: req.body.title,
      description: req.body.description || null,
      type: 'task',
      status: req.body.status || 'pending',
      priority: req.body.priority || 'medium',
      due_date: req.body.due_date || null,
      tags: req.body.tags || [],
      source: 'manual',
      created_at: new Date().toISOString(),
    };
    data.tasks.unshift(task);
    saveTasks(data.tasks);
    res.status(201).json(task);
  });

  app.put('/api/tasks/:id', (req: Request, res: Response) => {
    const data = getTasks();
    const index = data.tasks.findIndex((t) => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    data.tasks[index] = {
      ...data.tasks[index],
      ...req.body,
      updated_at: new Date().toISOString(),
    };
    saveTasks(data.tasks);
    res.json(data.tasks[index]);
  });

  app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    const data = getTasks();
    const filtered = data.tasks.filter((t) => t.id !== req.params.id);
    if (filtered.length === data.tasks.length) {
      return res.status(404).json({ error: 'Task not found' });
    }
    saveTasks(filtered);
    res.json({ success: true });
  });

  // ============= TRANSACTIONS =============

  app.get('/api/transactions', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = getTransactions();
    const sorted = data.transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    res.json(sorted.slice(0, limit));
  });

  app.get('/api/finance/summary', (req: Request, res: Response) => {
    const period = (req.query.period as string) || 'month';
    const data = getTransactions();

    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const filtered = data.transactions.filter((t) => new Date(t.date) >= startDate);

    const totalIncome = filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    res.json({
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      transactionCount: filtered.length,
    });
  });

  app.post('/api/transactions', (req: Request, res: Response) => {
    const data = getTransactions();
    const config = getConfig();

    const category = config.categories.find((c) => c.id === req.body.category_id);

    const transaction: Transaction = {
      id: generateId(),
      amount: req.body.amount,
      currency: req.body.currency || 'EUR',
      type: req.body.type,
      description: req.body.description || null,
      category: category?.name || req.body.category,
      category_id: req.body.category_id,
      date: req.body.date,
      created_at: new Date().toISOString(),
    };
    data.transactions.unshift(transaction);
    saveTransactions(data.transactions);
    res.status(201).json(transaction);
  });

  app.delete('/api/transactions/:id', (req: Request, res: Response) => {
    const data = getTransactions();
    const filtered = data.transactions.filter((t) => t.id !== req.params.id);
    if (filtered.length === data.transactions.length) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    saveTransactions(filtered);
    res.json({ success: true });
  });

  // ============= CATEGORIES =============

  app.get('/api/categories', (_req: Request, res: Response) => {
    const config = getConfig();
    res.json(config.categories);
  });

  // ============= REMINDERS (Not supported in local mode) =============

  app.get('/api/reminders', (_req: Request, res: Response) => {
    res.json([]);
  });

  app.get('/api/reminders/stats', (_req: Request, res: Response) => {
    res.json({ pending: 0, sentToday: 0 });
  });

  // ============= IDEAS (Not supported in local mode) =============

  app.get('/api/ideas', (_req: Request, res: Response) => {
    res.json([]);
  });

  // ============= DASHBOARD =============

  app.get('/api/dashboard', async (_req: Request, res: Response) => {
    const tasksData = getTasks();
    const transactionsData = getTransactions();
    const config = getConfig();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Task stats
    const taskStats = {
      total: tasksData.tasks.length,
      pending: tasksData.tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress')
        .length,
      completed: tasksData.tasks.filter((t) => t.status === 'completed').length,
      overdue: tasksData.tasks.filter((t) => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < now;
      }).length,
    };

    // Finance stats
    const monthTxs = transactionsData.transactions.filter((t) => new Date(t.date) >= startOfMonth);
    const financeStats = {
      totalIncome: monthTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalExpenses: monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      net: 0,
      transactionCount: monthTxs.length,
    };
    financeStats.net = financeStats.totalIncome - financeStats.totalExpenses;

    // Get recent items
    const recentTasks = tasksData.tasks
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentTransactions = transactionsData.transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    res.json({
      stats: {
        tasks: taskStats,
        finance: financeStats,
        reminders: { pending: 0, sentToday: 0 },
      },
      recentTasks,
      recentTransactions,
      upcomingReminders: [],
    });
  });

  return app;
}

export function startLocalAPI(port: number): Promise<void> {
  return new Promise((resolve) => {
    const app = createLocalAPI(port);
    app.listen(port, () => {
      resolve();
    });
  });
}
