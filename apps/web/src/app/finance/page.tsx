'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  PieChart, BarChart3, Calendar, Tag, Filter, Download,
  Sparkles, AlertCircle, CheckCircle, RefreshCw, X
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory?: string;
  bank: string;
  account?: string;
  aiConfidence: number;
  originalDescription: string;
  tags: string[];
}

interface CategorySummary {
  name: string;
  total: number;
  count: number;
  color: string;
  percentage: number;
}

interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

const STORAGE_KEY = 'optimai_local_finance';

function loadLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ============================================================================
// CSV PARSING
// ============================================================================

interface BankParser {
  name: string;
  detect: (headers: string[]) => boolean;
  parse: (row: string[], headers: string[]) => Partial<Transaction> | null;
}

const bankParsers: BankParser[] = [
  {
    name: 'BBVA',
    detect: (headers) => headers.some(h => h.toLowerCase().includes('concepto')) && headers.some(h => h.toLowerCase().includes('importe')),
    parse: (row, headers) => {
      const dateIdx = headers.findIndex(h => h.toLowerCase().includes('fecha'));
      const descIdx = headers.findIndex(h => h.toLowerCase().includes('concepto'));
      const amountIdx = headers.findIndex(h => h.toLowerCase().includes('importe'));

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) return null;

      const amount = parseFloat(row[amountIdx]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      return {
        date: row[dateIdx],
        description: row[descIdx],
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        bank: 'BBVA',
      };
    },
  },
  {
    name: 'Santander',
    detect: (headers) => headers.some(h => h.toLowerCase().includes('descripcion')) && headers.some(h => h.toLowerCase().includes('importe')),
    parse: (row, headers) => {
      const dateIdx = headers.findIndex(h => h.toLowerCase().includes('fecha'));
      const descIdx = headers.findIndex(h => h.toLowerCase().includes('descripcion'));
      const amountIdx = headers.findIndex(h => h.toLowerCase().includes('importe'));

      if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) return null;

      const amount = parseFloat(row[amountIdx]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      return {
        date: row[dateIdx],
        description: row[descIdx],
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        bank: 'Santander',
      };
    },
  },
  {
    name: 'Generic',
    detect: () => true, // Fallback parser
    parse: (row, headers) => {
      // Try common patterns
      let dateIdx = headers.findIndex(h => /fecha|date/i.test(h));
      let descIdx = headers.findIndex(h => /descripcion|description|concepto|detail/i.test(h));
      let amountIdx = headers.findIndex(h => /importe|amount|cantidad|monto/i.test(h));

      // If not found, use positional
      if (dateIdx === -1) dateIdx = 0;
      if (descIdx === -1) descIdx = 1;
      if (amountIdx === -1) amountIdx = headers.length - 1;

      const amount = parseFloat(row[amountIdx]?.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      return {
        date: row[dateIdx] || new Date().toISOString().split('T')[0],
        description: row[descIdx] || 'Sin descripción',
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        bank: 'Desconocido',
      };
    },
  },
];

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(/[,;\t]/).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = lines.slice(1).map(line =>
    line.split(/[,;\t]/).map(cell => cell.trim().replace(/^["']|["']$/g, ''))
  );

  return { headers, rows };
}

// ============================================================================
// AI CATEGORIZATION (simulated)
// ============================================================================

const categoryRules: { pattern: RegExp; category: string; subcategory?: string }[] = [
  { pattern: /amazon|aliexpress|ebay/i, category: 'Compras', subcategory: 'Online' },
  { pattern: /mercadona|carrefour|lidl|dia|super/i, category: 'Alimentación', subcategory: 'Supermercado' },
  { pattern: /restaurante|cafe|bar|mcdon|burger/i, category: 'Alimentación', subcategory: 'Restaurantes' },
  { pattern: /netflix|spotify|hbo|disney|prime/i, category: 'Suscripciones', subcategory: 'Entretenimiento' },
  { pattern: /openai|anthropic|google cloud|aws/i, category: 'Suscripciones', subcategory: 'Tech/AI' },
  { pattern: /uber|taxi|cabify|bolt/i, category: 'Transporte', subcategory: 'Taxi/VTC' },
  { pattern: /gasolina|repsol|cepsa|bp/i, category: 'Transporte', subcategory: 'Combustible' },
  { pattern: /luz|agua|gas|endesa|iberdrola/i, category: 'Hogar', subcategory: 'Suministros' },
  { pattern: /alquiler|hipoteca|comunidad/i, category: 'Hogar', subcategory: 'Vivienda' },
  { pattern: /nomina|salary|transfer/i, category: 'Ingresos', subcategory: 'Salario' },
  { pattern: /stripe|paypal|wise/i, category: 'Ingresos', subcategory: 'Pagos' },
];

function categorizeTransaction(description: string): { category: string; subcategory?: string; confidence: number } {
  const descLower = description.toLowerCase();

  for (const rule of categoryRules) {
    if (rule.pattern.test(descLower)) {
      return {
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: 85 + Math.random() * 15, // 85-100%
      };
    }
  }

  return {
    category: 'Otros',
    subcategory: undefined,
    confidence: 30 + Math.random() * 20, // 30-50%
  };
}

// ============================================================================
// COLORS
// ============================================================================

const categoryColors: Record<string, string> = {
  'Alimentación': '#22c55e',
  'Transporte': '#3b82f6',
  'Hogar': '#f59e0b',
  'Suscripciones': '#8b5cf6',
  'Compras': '#ec4899',
  'Ingresos': '#06b6d4',
  'Otros': '#64748b',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function FinanceToolPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load transactions on mount
  useEffect(() => {
    setTransactions(loadLocalTransactions());
  }, []);

  // Calculate summaries
  const categorySummaries: CategorySummary[] = (() => {
    const filtered = transactions.filter(t => {
      if (selectedMonth) {
        const txMonth = new Date(t.date).toISOString().slice(0, 7);
        if (txMonth !== selectedMonth) return false;
      }
      return t.type === 'expense';
    });

    const totals = new Map<string, number>();
    const counts = new Map<string, number>();
    let grandTotal = 0;

    filtered.forEach(t => {
      totals.set(t.category, (totals.get(t.category) || 0) + t.amount);
      counts.set(t.category, (counts.get(t.category) || 0) + 1);
      grandTotal += t.amount;
    });

    return Array.from(totals.entries())
      .map(([name, total]) => ({
        name,
        total,
        count: counts.get(name) || 0,
        color: categoryColors[name] || '#64748b',
        percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  })();

  const monthSummaries: MonthSummary[] = (() => {
    const months = new Map<string, { income: number; expenses: number }>();

    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      const current = months.get(month) || { income: 0, expenses: 0 };
      if (t.type === 'income') {
        current.income += t.amount;
      } else {
        current.expenses += t.amount;
      }
      months.set(month, current);
    });

    return Array.from(months.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        balance: data.income - data.expenses,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  })();

  const totalIncome = transactions.filter(t => {
    if (selectedMonth) {
      const txMonth = new Date(t.date).toISOString().slice(0, 7);
      if (txMonth !== selectedMonth) return false;
    }
    return t.type === 'income';
  }).reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions.filter(t => {
    if (selectedMonth) {
      const txMonth = new Date(t.date).toISOString().slice(0, 7);
      if (txMonth !== selectedMonth) return false;
    }
    return t.type === 'expense';
  }).reduce((sum, t) => sum + t.amount, 0);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    try {
      const content = await file.text();
      const { headers, rows } = parseCSV(content);

      if (headers.length === 0 || rows.length === 0) {
        throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
      }

      // Detect bank
      const parser = bankParsers.find(p => p.detect(headers)) || bankParsers[bankParsers.length - 1];
      console.log(`Detected bank: ${parser.name}`);

      // Parse transactions
      const newTransactions: Transaction[] = [];
      for (const row of rows) {
        if (row.length < 2) continue;

        const parsed = parser.parse(row, headers);
        if (!parsed || !parsed.description) continue;

        const { category, subcategory, confidence } = categorizeTransaction(parsed.description);

        newTransactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          date: parsed.date || new Date().toISOString().split('T')[0],
          description: parsed.description,
          originalDescription: parsed.description,
          amount: parsed.amount || 0,
          type: parsed.type || 'expense',
          category,
          subcategory,
          bank: parsed.bank || 'Desconocido',
          account: parsed.account,
          aiConfidence: confidence,
          tags: [],
        });
      }

      // Merge with existing (avoid duplicates by description + date + amount)
      const existing = new Set(
        transactions.map(t => `${t.date}-${t.description}-${t.amount}`)
      );
      const unique = newTransactions.filter(
        t => !existing.has(`${t.date}-${t.description}-${t.amount}`)
      );

      const merged = [...transactions, ...unique];
      setTransactions(merged);
      saveLocalTransactions(merged);
      setShowUploadModal(false);

      console.log(`Imported ${unique.length} new transactions`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setUploadError(error instanceof Error ? error.message : 'Error al procesar el archivo');
    }

    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [transactions]);

  // Filter transactions for display
  const filteredTransactions = transactions.filter(t => {
    if (selectedMonth) {
      const txMonth = new Date(t.date).toISOString().slice(0, 7);
      if (txMonth !== selectedMonth) return false;
    }
    if (selectedCategory && t.category !== selectedCategory) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Clear all data
  const clearAllData = useCallback(() => {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos financieros?')) {
      setTransactions([]);
      saveLocalTransactions([]);
    }
  }, []);

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
              <h1 className="text-xl font-bold">Tool: Finanzas</h1>
              <p className="text-sm text-slate-400">Análisis local de gastos con AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </button>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-red-400"
            >
              Borrar todo
            </button>
          </div>
        </div>
      </header>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Importar Extracto Bancario</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              Sube un archivo CSV de tu banco. Soportamos BBVA, Santander y formato genérico.
            </p>

            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                <p className="text-slate-300">Click para seleccionar archivo</p>
                <p className="text-xs text-slate-500 mt-1">Solo archivos CSV</p>
              </label>
            </div>

            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-cyan-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Procesando...
              </div>
            )}

            {uploadError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {uploadError}
              </div>
            )}

            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-400">
                <strong>Privacidad:</strong> Todos los datos se procesan y almacenan localmente.
                Nunca se suben a ningún servidor.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-800/50 border-r border-slate-700 p-4 min-h-[calc(100vh-73px)]">
          {/* Summary Cards */}
          <div className="space-y-3 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Ingresos</span>
              </div>
              <p className="text-xl font-bold text-green-400">
                €{totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Gastos</span>
              </div>
              <p className="text-xl font-bold text-red-400">
                €{totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className={`${totalIncome - totalExpenses >= 0 ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-orange-500/10 border-orange-500/30'} border rounded-lg p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Balance</span>
              </div>
              <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                €{(totalIncome - totalExpenses).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Month Filter */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Mes</h3>
            <button
              onClick={() => setSelectedMonth(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedMonth === null ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
              }`}
            >
              Todos los meses
            </button>
            {monthSummaries.slice(0, 6).map(m => (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between ${
                  selectedMonth === m.month ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
                }`}
              >
                <span>{new Date(m.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                <span className={m.balance >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {m.balance >= 0 ? '+' : ''}{m.balance.toFixed(0)}€
                </span>
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Categorías</h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedCategory === null ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            {categorySummaries.map(cat => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  selectedCategory === cat.name ? 'bg-cyan-600/20 text-cyan-400' : 'hover:bg-slate-700'
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="flex-1">{cat.name}</span>
                <span className="text-slate-500 text-sm">€{cat.total.toFixed(0)}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-20">
              <PieChart className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No hay transacciones</h2>
              <p className="text-slate-400 mb-6">Importa un extracto CSV de tu banco para comenzar</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Importar CSV
              </button>
            </div>
          ) : (
            <>
              {/* Category Chart */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-4">Distribución de Gastos</h3>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 relative">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {categorySummaries.reduce((acc, cat, idx) => {
                        const startAngle = acc.offset;
                        const angle = (cat.percentage / 100) * 360;
                        const largeArc = angle > 180 ? 1 : 0;
                        const endX = 50 + 40 * Math.cos((startAngle + angle) * Math.PI / 180);
                        const endY = 50 + 40 * Math.sin((startAngle + angle) * Math.PI / 180);
                        const startX = 50 + 40 * Math.cos(startAngle * Math.PI / 180);
                        const startY = 50 + 40 * Math.sin(startAngle * Math.PI / 180);

                        acc.elements.push(
                          <path
                            key={cat.name}
                            d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                            fill={cat.color}
                            className="transition-all hover:opacity-80"
                          />
                        );
                        acc.offset += angle;
                        return acc;
                      }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                    </svg>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {categorySummaries.map(cat => (
                      <div key={cat.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-slate-400">{cat.name}</span>
                        <span className="ml-auto">{cat.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-semibold">Transacciones ({filteredTransactions.length})</h3>
                </div>
                <div className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto">
                  {filteredTransactions.map(tx => (
                    <div key={tx.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-700/30">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: categoryColors[tx.category] + '30' }}>
                        <DollarSign className="w-5 h-5" style={{ color: categoryColors[tx.category] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{new Date(tx.date).toLocaleDateString('es-ES')}</span>
                          <span>•</span>
                          <span style={{ color: categoryColors[tx.category] }}>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.bank}</span>
                          {tx.aiConfidence < 60 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Revisar
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`text-right ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        <p className="font-semibold">
                          {tx.type === 'income' ? '+' : '-'}€{tx.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500">
                          AI: {tx.aiConfidence.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
