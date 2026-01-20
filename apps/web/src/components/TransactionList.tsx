'use client';

import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { Transaction } from '@/lib/api';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No hay transacciones recientes
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {transaction.type === 'income' ? (
              <ArrowUpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {transaction.description || 'Sin descripción'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {transaction.category || 'Sin categoría'} • {new Date(transaction.date).toLocaleDateString('es-ES')}
            </p>
          </div>
          <span className={`font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount), transaction.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
