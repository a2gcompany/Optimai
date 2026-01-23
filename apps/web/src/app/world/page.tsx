'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Terminal {
  id: string;
  name: string;
  client_type: string;
  session_id: string;
  status: 'active' | 'thinking' | 'coding' | 'idle' | 'offline';
  current_task: string | null;
  current_file: string | null;
  speech_bubble: string | null;
  tasks_completed: number;
  energy: number;
  last_heartbeat: string;
}

interface Pueblo {
  id: string;
  nombre: string;
  owner_name: string;
  avatar_emoji: string;
  color_primary: string;
  color_secondary: string;
  terminals: Terminal[];
  stats: {
    terminals_active: number;
    tasks_pending: number;
    tasks_completed_today: number;
    energy: number;
  };
}

interface Activity {
  id: string;
  pueblo_name: string;
  terminal_name: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface WorldState {
  pueblos: Pueblo[];
  activity: Activity[];
  timestamp: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLIENT_ICONS: Record<string, string> = {
  'claude-code': '🤖',
  'cursor': '🖱️',
  'codex': '📝',
  'copilot': '✈️',
  'aider': '🔧',
  'other': '💻',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; animate: boolean }> = {
  active: { label: 'Activo', color: 'bg-green-500', animate: true },
  thinking: { label: 'Pensando', color: 'bg-purple-500', animate: true },
  coding: { label: 'Codeando', color: 'bg-blue-500', animate: true },
  idle: { label: 'Esperando', color: 'bg-yellow-500', animate: false },
  offline: { label: 'Offline', color: 'bg-slate-500', animate: false },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function TerminalCard({ terminal }: { terminal: Terminal }) {
  const config = STATUS_CONFIG[terminal.status] || STATUS_CONFIG.offline;
  const icon = CLIENT_ICONS[terminal.client_type] || CLIENT_ICONS.other;
  const isOnline = terminal.status !== 'offline';

  return (
    <div
      className={`
        relative p-3 rounded-lg border-2 transition-all
        ${isOnline ? 'bg-slate-700/80 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-60'}
      `}
    >
      {/* Status indicator */}
      <div className="absolute -top-1 -right-1 flex items-center gap-1">
        <span
          className={`w-3 h-3 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{terminal.name}</div>
          <div className="text-xs text-slate-400">{terminal.client_type}</div>
        </div>
      </div>

      {/* Current task */}
      {terminal.current_task && (
        <div className="text-xs text-slate-300 bg-slate-800/50 rounded px-2 py-1 truncate">
          {terminal.current_task}
        </div>
      )}

      {/* Speech bubble */}
      {terminal.speech_bubble && isOnline && (
        <div className="mt-2 text-xs text-slate-400 italic">
          &quot;{terminal.speech_bubble}&quot;
        </div>
      )}

      {/* Stats */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>✓ {terminal.tasks_completed}</span>
        <span>⚡ {terminal.energy}%</span>
      </div>
    </div>
  );
}

function PuebloCard({ pueblo, expanded, onToggle }: { pueblo: Pueblo; expanded: boolean; onToggle: () => void }) {
  const activeTerminals = pueblo.terminals.filter((t) => t.status !== 'offline');
  const hasActivity = activeTerminals.length > 0;

  return (
    <div
      className={`
        rounded-xl border-4 transition-all cursor-pointer
        ${hasActivity ? 'shadow-lg shadow-black/20' : 'opacity-80'}
      `}
      style={{
        backgroundColor: pueblo.color_primary + '20',
        borderColor: pueblo.color_primary,
      }}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{pueblo.avatar_emoji}</span>
          <div className="flex-1">
            <div className="text-lg font-bold text-white">{pueblo.owner_name}</div>
            <div className="text-sm text-slate-400">{pueblo.nombre}</div>
          </div>
          {hasActivity && (
            <div
              className="w-4 h-4 rounded-full animate-pulse"
              style={{ backgroundColor: pueblo.color_primary }}
            />
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-lg font-bold text-white">{pueblo.stats.terminals_active}</div>
            <div className="text-slate-400">Activos</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-lg font-bold text-green-400">{pueblo.stats.tasks_completed_today}</div>
            <div className="text-slate-400">Hoy</div>
          </div>
          <div className="bg-slate-800/50 rounded p-2">
            <div className="text-lg font-bold text-orange-400">{pueblo.stats.tasks_pending}</div>
            <div className="text-slate-400">Pendiente</div>
          </div>
        </div>
      </div>

      {/* Terminals (expanded) */}
      {expanded && (
        <div className="p-4 space-y-3">
          {pueblo.terminals.length === 0 ? (
            <div className="text-center text-slate-500 py-4">
              <div className="text-2xl mb-2">💤</div>
              <div>Sin terminales conectadas</div>
            </div>
          ) : (
            pueblo.terminals.map((terminal) => (
              <TerminalCard key={terminal.id} terminal={terminal} />
            ))
          )}
        </div>
      )}

      {/* Expand indicator */}
      <div className="text-center py-2 text-slate-500 text-xs">
        {expanded ? '▲ Colapsar' : `▼ Ver ${pueblo.terminals.length} terminales`}
      </div>
    </div>
  );
}

function ActivityFeed({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return (
      <div className="text-slate-500 text-center py-4">
        Sin actividad reciente
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {activity.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 p-2 bg-slate-800/50 rounded text-xs"
        >
          <span className="text-slate-500">
            {new Date(item.created_at).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-slate-400">{item.pueblo_name}</span>
          <span className="text-white flex-1 truncate">{item.description}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const [data, setData] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPueblo, setExpandedPueblo] = useState<string | null>(null);

  // Fetch data from /api/terminals
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/terminals');
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        console.error('Error fetching world state:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Count total active terminals
  const totalActive = data?.pueblos.reduce(
    (acc, p) => acc + p.stats.terminals_active,
    0
  ) || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-mono">
      {/* Header */}
      <header className="border-b-4 border-slate-700 bg-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Dashboard
              </button>
              <h1 className="text-xl font-bold flex items-center gap-2">
                🌍 World
                <span className="text-sm font-normal text-slate-400">
                  - Terminales en tiempo real
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div
                className={`px-3 py-1 rounded text-xs border-2 ${
                  error
                    ? 'border-red-500 text-red-400 bg-red-500/20'
                    : totalActive > 0
                    ? 'border-green-500 text-green-400 bg-green-500/20'
                    : 'border-slate-500 text-slate-400 bg-slate-500/20'
                }`}
              >
                {error ? '○ Error' : totalActive > 0 ? `● ${totalActive} activos` : '○ Sin actividad'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500 animate-pulse text-lg">Cargando mundo...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-2">❌ {error}</div>
              <div className="text-slate-500 text-sm">Reintentando cada 5 segundos...</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pueblos */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                🏘️ Pueblos
                <span className="text-sm font-normal text-slate-400">
                  ({data?.pueblos.length || 0})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.pueblos.map((pueblo) => (
                  <PuebloCard
                    key={pueblo.id}
                    pueblo={pueblo}
                    expanded={expandedPueblo === pueblo.id}
                    onToggle={() =>
                      setExpandedPueblo(expandedPueblo === pueblo.id ? null : pueblo.id)
                    }
                  />
                ))}
              </div>

              {/* Empty state */}
              {(!data?.pueblos || data.pueblos.length === 0) && (
                <div className="text-center py-12 text-slate-500">
                  <div className="text-4xl mb-4">🏜️</div>
                  <div className="text-lg">No hay pueblos registrados</div>
                  <div className="text-sm mt-2">
                    Conecta una terminal usando el endpoint /api/terminals/heartbeat
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How to connect */}
              <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  📡 Conectar terminal
                </h3>
                <div className="text-xs text-slate-400 space-y-2">
                  <p>Cada terminal reporta su estado via API:</p>
                  <pre className="bg-slate-900 p-2 rounded text-[10px] overflow-x-auto">
{`POST /api/terminals/heartbeat
{
  "session_id": "unique-id",
  "owner_name": "Aitzol",
  "client_type": "claude-code",
  "status": "coding",
  "current_task": "Trabajando en X"
}`}
                  </pre>
                  <p className="text-slate-500">
                    Llamar cada 30s para mantener activo
                  </p>
                </div>
              </div>

              {/* Activity feed */}
              <div className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  📋 Actividad reciente
                </h3>
                <ActivityFeed activity={data?.activity || []} />
              </div>

              {/* Last update */}
              <div className="text-center text-xs text-slate-600">
                Última actualización:{' '}
                {data?.timestamp
                  ? new Date(data.timestamp).toLocaleTimeString('es-ES')
                  : '-'}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-600">
          Optimai World • Multi-user terminal monitoring • Refresh cada 5s
        </div>
      </footer>
    </div>
  );
}
