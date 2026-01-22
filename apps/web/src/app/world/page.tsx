'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

type RalphStatus = 'running' | 'idle' | 'stopped';
type BuildingId = 'hq' | 'taller' | 'banco' | 'biblioteca' | 'torre';

interface WorldSummary {
  ralph: {
    status: RalphStatus;
    currentBuilding: BuildingId;
    lastAction: string;
    energy: number;
    loopCount: number;
    updatedAt: string;
  };
  counts: {
    tasksPending: number;
    tasksCompleted: number;
    tasksCompletedToday: number;
    ideas: number;
    remindersActive: number;
  };
  finance: {
    total: number;
  };
  source: 'supabase' | 'fallback';
}

interface BuildingConfig {
  id: BuildingId;
  name: string;
  emoji: string;
  color: string;
  route: string;
  position: 'top' | 'left' | 'center' | 'right' | 'bottom';
  getCount: (data: WorldSummary) => number | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUILDINGS: BuildingConfig[] = [
  {
    id: 'biblioteca',
    name: 'Biblioteca',
    emoji: '📚',
    color: '#a855f7',
    route: '/ideas',
    position: 'top',
    getCount: (d) => d.counts.ideas,
  },
  {
    id: 'taller',
    name: 'Taller',
    emoji: '🔧',
    color: '#fb923c',
    route: '/tasks',
    position: 'left',
    getCount: (d) => d.counts.tasksPending,
  },
  {
    id: 'hq',
    name: 'HQ',
    emoji: '🏛️',
    color: '#2dd4bf',
    route: '/',
    position: 'center',
    getCount: () => null,
  },
  {
    id: 'banco',
    name: 'Banco',
    emoji: '🏦',
    color: '#4ade80',
    route: '/finance',
    position: 'right',
    getCount: (d) => d.finance.total,
  },
  {
    id: 'torre',
    name: 'Torre',
    emoji: '🗼',
    color: '#f87171',
    route: '/reminders',
    position: 'bottom',
    getCount: (d) => d.counts.remindersActive,
  },
];

const STATUS_CONFIG: Record<RalphStatus, { label: string; color: string; bg: string; icon: string }> = {
  running: { label: 'Trabajando', color: 'text-green-400', bg: 'bg-green-500/20', icon: '⚙️' },
  idle: { label: 'Esperando', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: '💤' },
  stopped: { label: 'Detenido', color: 'text-slate-400', bg: 'bg-slate-500/20', icon: '⏹️' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function Building({
  config,
  count,
  isRalphHere,
  ralphStatus,
  onClick,
}: {
  config: BuildingConfig;
  count: number | null;
  isRalphHere: boolean;
  ralphStatus: RalphStatus;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-20 h-20
        border-4 rounded-lg
        flex flex-col items-center justify-center
        transition-all duration-300
        hover:scale-105 hover:brightness-125
        ${isRalphHere ? 'ring-2 ring-white/60' : ''}
      `}
      style={{
        backgroundColor: config.color + '30',
        borderColor: config.color,
        filter: ralphStatus === 'stopped' ? 'grayscale(0.5)' : 'none',
      }}
    >
      <span className="text-2xl">{config.emoji}</span>
      <span className="text-[10px] font-mono text-white/80 mt-1">{config.name}</span>

      {/* Counter badge */}
      {count !== null && (
        <span
          className="absolute -top-2 -right-2 min-w-6 h-6 px-1 rounded-full text-xs font-bold flex items-center justify-center text-white"
          style={{ backgroundColor: config.color }}
        >
          {typeof count === 'number' && count > 999 ? '999+' : count}
        </span>
      )}

      {/* Ralph indicator */}
      {isRalphHere && (
        <div
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-sm ${
            ralphStatus === 'running' ? 'animate-bounce' : ''
          }`}
          style={{
            backgroundColor: ralphStatus === 'stopped' ? '#666' : '#2dd4bf',
            boxShadow: ralphStatus !== 'stopped' ? '0 0 8px #2dd4bf' : 'none',
          }}
        />
      )}
    </button>
  );
}

function Sidebar({ data, loading }: { data: WorldSummary | null; loading: boolean }) {
  if (loading) {
    return (
      <aside className="w-56 border-l-4 border-slate-700 bg-slate-800/80 p-4 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse">Cargando...</div>
      </aside>
    );
  }

  if (!data) {
    return (
      <aside className="w-56 border-l-4 border-slate-700 bg-slate-800/80 p-4 flex items-center justify-center">
        <div className="text-red-400">Sin conexión</div>
      </aside>
    );
  }

  const status = STATUS_CONFIG[data.ralph.status];
  const lastUpdate = new Date(data.ralph.updatedAt);
  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);

  return (
    <aside className="w-56 border-l-4 border-slate-700 bg-slate-800/80 p-4 flex flex-col gap-4 font-mono text-sm">
      {/* Status */}
      <div className={`${status.bg} rounded-lg p-3`}>
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estado Ralph</div>
        <div className={`text-lg font-bold ${status.color} flex items-center gap-2`}>
          <span>{status.icon}</span>
          <span>{status.label}</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">{data.ralph.lastAction}</div>
      </div>

      {/* Loop counter */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Loop</div>
        <div className="text-2xl font-bold text-cyan-400">#{data.ralph.loopCount}</div>
      </div>

      {/* Energy bar */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-500 uppercase tracking-wider">Energía</span>
          <span className="text-yellow-400">{data.ralph.energy}/50</span>
        </div>
        <div className="h-3 bg-slate-600 rounded overflow-hidden border border-slate-500">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${(data.ralph.energy / 50) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="bg-slate-700/50 rounded-lg p-3">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Stats</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-orange-400 font-bold text-lg">{data.counts.tasksPending}</div>
            <div className="text-[10px] text-slate-400">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-bold text-lg">{data.counts.tasksCompletedToday}</div>
            <div className="text-[10px] text-slate-400">Hoy</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-bold text-lg">{data.counts.ideas}</div>
            <div className="text-[10px] text-slate-400">Ideas</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-bold text-lg">{data.counts.remindersActive}</div>
            <div className="text-[10px] text-slate-400">Recordatorios</div>
          </div>
        </div>
      </div>

      {/* Source & time */}
      <div className="mt-auto text-[10px] text-slate-600 text-center space-y-1">
        <div>Fuente: {data.source}</div>
        <div>Hace {timeSinceUpdate < 60 ? `${timeSinceUpdate}s` : `${Math.floor(timeSinceUpdate / 60)}m`}</div>
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const [data, setData] = useState<WorldSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from /api/world/summary
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/world/summary');
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        console.error('Error fetching world summary:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const ralphStatus = data?.ralph.status || 'stopped';
  const ralphBuilding = data?.ralph.currentBuilding || 'hq';

  return (
    <div
      className={`min-h-screen text-white flex font-mono transition-all duration-500 ${
        ralphStatus === 'stopped' ? 'bg-slate-950' : 'bg-slate-900'
      }`}
    >
      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b-4 border-slate-700 bg-slate-800/80 p-4">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Dashboard
              </button>
              <h1 className="text-lg font-bold">🏘️ Pueblo de Aitzol</h1>
            </div>
            <div
              className={`px-3 py-1 rounded text-xs border-2 ${
                error
                  ? 'border-red-500 text-red-400 bg-red-500/20'
                  : ralphStatus === 'stopped'
                  ? 'border-slate-500 text-slate-400 bg-slate-500/20'
                  : 'border-green-500 text-green-400 bg-green-500/20'
              }`}
            >
              {error ? '○ Error' : ralphStatus === 'stopped' ? '○ Offline' : '● Online'}
            </div>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 flex items-center justify-center p-8">
          {loading ? (
            <div className="text-slate-500 animate-pulse text-lg">Cargando mundo...</div>
          ) : error ? (
            <div className="text-center">
              <div className="text-red-400 text-lg mb-2">❌ {error}</div>
              <div className="text-slate-500 text-sm">Reintentando cada 5 segundos...</div>
            </div>
          ) : (
            <div
              className="relative bg-slate-800/50 border-4 border-slate-700 rounded-xl p-8"
              style={{
                display: 'grid',
                gridTemplateAreas: `
                  ". top ."
                  "left center right"
                  ". bottom ."
                `,
                gridTemplateColumns: '1fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                gap: '32px',
                width: '420px',
                height: '380px',
              }}
            >
              {/* Ground pattern */}
              <div
                className="absolute inset-4 rounded-lg opacity-20 pointer-events-none"
                style={{
                  background: `
                    repeating-linear-gradient(0deg, transparent, transparent 24px, #1a2f1a 24px, #1a2f1a 25px),
                    repeating-linear-gradient(90deg, transparent, transparent 24px, #1a2f1a 24px, #1a2f1a 25px),
                    #243524
                  `,
                }}
              />

              {/* Buildings */}
              {BUILDINGS.map((building) => (
                <div
                  key={building.id}
                  className="flex items-center justify-center z-10"
                  style={{ gridArea: building.position }}
                >
                  <Building
                    config={building}
                    count={data ? building.getCount(data) : null}
                    isRalphHere={ralphBuilding === building.id}
                    ralphStatus={ralphStatus}
                    onClick={() => router.push(building.route)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4 text-slate-600 text-xs">
          Click en un edificio para navegar • Ralph se posiciona según actividad real
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar data={data} loading={loading} />
    </div>
  );
}
