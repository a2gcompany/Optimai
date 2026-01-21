'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, ArrowUpDown, Wallet, Upload } from 'lucide-react';
import { Sidebar } from '@/components';
import { api, Transaction, DashboardStats } from '@/lib/api';
import { DbCategory } from '@/lib/supabase';

const typeStyles = {
  income: 'text-green-600 dark:text-green-400',
  expense: 'text-red-600 dark:text-red-400',
  transfer: 'text-blue-600 dark:text-blue-400',
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [summary, setSummary] = useState<DashboardStats['finance']>({ totalIncome: 0, totalExpenses: 0, net: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [showForm, setShowForm] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'expense' as Transaction['type'],
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    const [txs, cats, sum] = await Promise.all([
      api.getTransactions(50),
      api.getCategories(),
      api.getFinanceSummary(period),
    ]);
    setTransactions(txs);
    setCategories(cats);
    setSummary(sum);
    setLoading(false);
  }

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!newTx.amount || !newTx.description) return;

    await api.createTransaction({
      amount: parseFloat(newTx.amount) * (newTx.type === 'expense' ? -1 : 1),
      currency: 'EUR',
      type: newTx.type,
      description: newTx.description,
      category_id: newTx.category_id || undefined,
      date: newTx.date,
    });

    setNewTx({
      amount: '',
      type: 'expense',
      description: '',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
    loadData();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredCategories = categories.filter((c) => c.type === newTx.type);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finanzas</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona tus ingresos y gastos
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva Transacción
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalIncome)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gastos</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalExpenses)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${summary.net >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Wallet className={`w-5 h-5 ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                <p className={`text-xl font-bold ${summary.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(summary.net)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ArrowUpDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transacciones</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.transactionCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>

        {/* New Transaction Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    step="0.01"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="Cantidad..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                </div>
                <select
                  value={newTx.type}
                  onChange={(e) => setNewTx({ ...newTx, type: e.target.value as Transaction['type'], category_id: '' })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  placeholder="Descripción..."
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <select
                  value={newTx.category_id}
                  onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Sin categoría</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  Guardar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transactions List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transacciones</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay transacciones</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((tx) => (
                <li key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : tx.type === 'expense' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {tx.type === 'income' ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : tx.type === 'expense' ? (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{tx.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{new Date(tx.date).toLocaleDateString('es-ES')}</span>
                          {tx.category && <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{tx.category}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={`text-lg font-semibold ${typeStyles[tx.type]}`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(Math.abs(tx.amount))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
