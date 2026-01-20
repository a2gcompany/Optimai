'use client';

import { useEffect, useState } from 'react';
import {
  CheckSquare,
  Wallet,
  Bell,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity
} from 'lucide-react';
import { StatCard, TaskList, TransactionList, ReminderList, Sidebar } from '@/components';
import { api, type DashboardStats, type Task, type Transaction, type Reminder } from '@/lib/api';

// Mock data para desarrollo
const mockStats: DashboardStats = {
  tasks: { total: 24, pending: 8, completed: 14, overdue: 2 },
  finance: { totalIncome: 15420.50, totalExpenses: 8750.25, net: 6670.25, transactionCount: 47 },
  reminders: { pending: 3, sentToday: 5 },
};

const mockTasks: Task[] = [
  { id: '1', title: 'Revisar contrato de Roger Sanchez', status: 'pending', priority: 'high', due_date: '2026-01-25', created_at: '2026-01-20' },
  { id: '2', title: 'Preparar reunión con BABEL', status: 'in_progress', priority: 'medium', due_date: '2026-01-22', created_at: '2026-01-19' },
  { id: '3', title: 'Enviar facturas de enero', status: 'pending', priority: 'high', due_date: '2026-01-23', created_at: '2026-01-18' },
  { id: '4', title: 'Actualizar portfolio de Prophecy', status: 'completed', priority: 'low', created_at: '2026-01-15' },
  { id: '5', title: 'Configurar Stripe para S-CORE', status: 'pending', priority: 'medium', due_date: '2026-01-28', created_at: '2026-01-20' },
];

const mockTransactions: Transaction[] = [
  { id: '1', amount: 5000, currency: 'EUR', type: 'income', description: 'Booking Roger Sanchez - Ushuaia', category: 'Artistas', date: '2026-01-20' },
  { id: '2', amount: 1250.50, currency: 'EUR', type: 'expense', description: 'Publicidad Meta - PAIDDADS', category: 'Marketing', date: '2026-01-19' },
  { id: '3', amount: 2500, currency: 'EUR', type: 'income', description: 'Comisión Prophecy - Ultra', category: 'Artistas', date: '2026-01-18' },
  { id: '4', amount: 89.99, currency: 'EUR', type: 'expense', description: 'Suscripción OpenAI API', category: 'Software', date: '2026-01-17' },
  { id: '5', amount: 350, currency: 'EUR', type: 'expense', description: 'Vuelo Madrid-Ibiza', category: 'Viajes', date: '2026-01-16' },
];

const mockReminders: Reminder[] = [
  { id: '1', message: 'Llamar a Neil sobre contrato de Roger', scheduled_at: '2026-01-21T14:00:00Z' },
  { id: '2', message: 'Revisar métricas de Tipit', scheduled_at: '2026-01-21T18:00:00Z' },
  { id: '3', message: 'Enviar propuesta a BABEL Music', scheduled_at: '2026-01-22T10:00:00Z' },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(mockStats);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await api.getDashboardData();
        // Solo actualiza si hay datos reales
        if (data.recentTasks.length > 0) setTasks(data.recentTasks);
        if (data.recentTransactions.length > 0) setTransactions(data.recentTransactions);
        if (data.upcomingReminders.length > 0) setReminders(data.upcomingReminders);
        if (data.stats.tasks.total > 0) setStats(data.stats);
      } catch (error) {
        // En caso de error, mantener los datos mock
        console.log('Usando datos de demostración');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Bienvenido de nuevo. Aquí está el resumen de tu día.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Tareas Pendientes"
            value={stats.tasks.pending}
            subtitle={`${stats.tasks.overdue} vencidas`}
            icon={CheckSquare}
            color="blue"
          />
          <StatCard
            title="Balance del Mes"
            value={formatCurrency(stats.finance.net)}
            subtitle={`${stats.finance.transactionCount} transacciones`}
            icon={stats.finance.net >= 0 ? TrendingUp : TrendingDown}
            color={stats.finance.net >= 0 ? 'green' : 'red'}
            trend={{ value: 12, isPositive: stats.finance.net >= 0 }}
          />
          <StatCard
            title="Ingresos"
            value={formatCurrency(stats.finance.totalIncome)}
            icon={Wallet}
            color="green"
          />
          <StatCard
            title="Recordatorios"
            value={stats.reminders.pending}
            subtitle={`${stats.reminders.sentToday} enviados hoy`}
            icon={Bell}
            color="yellow"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-500" />
                Tareas Recientes
              </h2>
              <a href="/tasks" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Ver todas →
              </a>
            </div>
            <TaskList tasks={tasks} />
          </div>

          {/* Reminders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-500" />
                Próximos Recordatorios
              </h2>
              <a href="/reminders" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Ver todos →
              </a>
            </div>
            <ReminderList reminders={reminders} />
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Últimas Transacciones
            </h2>
            <a href="/finance" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Ver todas →
            </a>
          </div>
          <TransactionList transactions={transactions} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Optimai v0.1.0 • Conectado a Telegram • Última sincronización: hace 2 min
        </div>
      </main>
    </div>
  );
}
