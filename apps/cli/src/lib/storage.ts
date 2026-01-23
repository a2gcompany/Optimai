import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { TasksFile, TransactionsFile, ConfigFile, Category } from './types.js';

export const OPTIMAI_DIR = join(homedir(), 'optimai');
export const TASKS_FILE = join(OPTIMAI_DIR, 'tasks', 'tasks.json');
export const TRANSACTIONS_FILE = join(OPTIMAI_DIR, 'finance', 'transactions.json');
export const CONFIG_FILE = join(OPTIMAI_DIR, 'config.json');

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readJSON<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureDir(filePath);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Salario', type: 'income', color: '#22c55e', icon: 'banknotes' },
  { id: 'cat-2', name: 'Freelance', type: 'income', color: '#10b981', icon: 'briefcase' },
  { id: 'cat-3', name: 'Inversiones', type: 'income', color: '#14b8a6', icon: 'trending-up' },
  { id: 'cat-4', name: 'Alimentación', type: 'expense', color: '#f59e0b', icon: 'utensils' },
  { id: 'cat-5', name: 'Transporte', type: 'expense', color: '#3b82f6', icon: 'car' },
  { id: 'cat-6', name: 'Vivienda', type: 'expense', color: '#8b5cf6', icon: 'home' },
  { id: 'cat-7', name: 'Entretenimiento', type: 'expense', color: '#ec4899', icon: 'gamepad-2' },
  { id: 'cat-8', name: 'Salud', type: 'expense', color: '#ef4444', icon: 'heart-pulse' },
  { id: 'cat-9', name: 'Suscripciones', type: 'expense', color: '#a855f7', icon: 'repeat' },
  { id: 'cat-10', name: 'Software', type: 'expense', color: '#6366f1', icon: 'code' },
  { id: 'cat-11', name: 'Marketing', type: 'expense', color: '#f43f5e', icon: 'megaphone' },
  { id: 'cat-12', name: 'Viajes', type: 'expense', color: '#0ea5e9', icon: 'plane' },
  { id: 'cat-13', name: 'Artistas', type: 'income', color: '#8b5cf6', icon: 'music' },
  { id: 'cat-14', name: 'Otros', type: 'expense', color: '#64748b', icon: 'more-horizontal' },
];

export function isInitialized(): boolean {
  return existsSync(OPTIMAI_DIR) && existsSync(CONFIG_FILE);
}

export function initializeOptimaiDir(): void {
  // Create directories
  mkdirSync(join(OPTIMAI_DIR, 'tasks'), { recursive: true });
  mkdirSync(join(OPTIMAI_DIR, 'finance'), { recursive: true });

  // Initialize tasks file
  if (!existsSync(TASKS_FILE)) {
    const tasksFile: TasksFile = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      tasks: [],
    };
    writeJSON(TASKS_FILE, tasksFile);
  }

  // Initialize transactions file
  if (!existsSync(TRANSACTIONS_FILE)) {
    const transactionsFile: TransactionsFile = {
      version: '1.0',
      lastModified: new Date().toISOString(),
      transactions: [],
    };
    writeJSON(TRANSACTIONS_FILE, transactionsFile);
  }

  // Initialize config file
  if (!existsSync(CONFIG_FILE)) {
    const configFile: ConfigFile = {
      version: '1.0',
      webPort: 3000,
      apiPort: 3001,
      categories: DEFAULT_CATEGORIES,
    };
    writeJSON(CONFIG_FILE, configFile);
  }
}

// Tasks CRUD
export function getTasks(): TasksFile {
  const data = readJSON<TasksFile>(TASKS_FILE);
  return data || { version: '1.0', lastModified: new Date().toISOString(), tasks: [] };
}

export function saveTasks(tasks: TasksFile['tasks']): void {
  const file: TasksFile = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    tasks,
  };
  writeJSON(TASKS_FILE, file);
}

// Transactions CRUD
export function getTransactions(): TransactionsFile {
  const data = readJSON<TransactionsFile>(TRANSACTIONS_FILE);
  return data || { version: '1.0', lastModified: new Date().toISOString(), transactions: [] };
}

export function saveTransactions(transactions: TransactionsFile['transactions']): void {
  const file: TransactionsFile = {
    version: '1.0',
    lastModified: new Date().toISOString(),
    transactions,
  };
  writeJSON(TRANSACTIONS_FILE, file);
}

// Config
export function getConfig(): ConfigFile {
  const data = readJSON<ConfigFile>(CONFIG_FILE);
  return data || {
    version: '1.0',
    webPort: 3000,
    apiPort: 3001,
    categories: DEFAULT_CATEGORIES,
  };
}

export function saveConfig(config: ConfigFile): void {
  writeJSON(CONFIG_FILE, config);
}
