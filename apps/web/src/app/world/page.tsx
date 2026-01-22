'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES (from /api/ralph)
// ============================================================================

interface RalphStatus {
  state: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  currentTask: string;
  speechBubble: string;
  energy: {
    current: number;
    max: number;
    nextReset: string;
  };
  stats: {
    tasksCompleted: number;
    tasksPending: number;
    ideasCount: number;
    remindersCount: number;
    loopCount: number;
    callsThisHour: number;
  };
  source: 'local' | 'supabase' | 'fallback';
}

// ============================================================================
// BUILDINGS CONFIG
// ============================================================================

const BUILDINGS = [
  { id: 'biblioteca', name: 'Biblioteca', emoji: '📚', color: '#a855f7', route: '/ideas', position: 'top', statKey: 'ideasCount' },
  { id: 'taller', name: 'Taller', emoji: '🔧', color: '#fb923c', route: '/tasks', position: 'left', statKey: 'tasksPending' },
  { id: 'hq', name: 'HQ', emoji: '🏛️', color: '#2dd4bf', route: '/', position: 'center', statKey: null },
  { id: 'banco', name: 'Banco', emoji: '🏦', color: '#4ade80', route: '/finance', position: 'right', statKey: 'tasksCompleted' },
  { id: 'torre', name: 'Torre', emoji: '🗼', color: '#f87171', route: '/reminders', position: 'bottom', statKey: 'remindersCount' },
] as const;

// Map Ralph state to building
function getRalphBuilding(state: RalphStatus['state']): string {
  switch (state) {
    case 'building': return 'taller';
    case 'thinking': return 'biblioteca';
    case 'walking': return 'hq';
    case 'disconnected': return 'torre';
    default: return 'hq';
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Building({
  building,
  stat,
  isActive,
  onClick
}: {
  building: typeof BUILDINGS[number];
  stat: number | null;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-20 h-20
        border-4 rounded-lg
        flex flex-col items-center justify-center
        transition-all duration-200
        hover:scale-110 hover:brightness-110
        ${isActive ? 'ring-4 ring-white/50 animate-pulse' : ''}
      `}
      style={{
        backgroundColor: building.color + '40',
        borderColor: building.color,
      }}
    >
      <span className="text-2xl">{building.emoji}</span>
      <span className="text-[10px] font-mono text-white/80 mt-1">{building.name}</span>
      {stat !== null && (
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
          style={{ backgroundColor: building.color }}
        >
          {stat}
        </span>
      )}
    </button>
  );
}

function Ralph({
  state,
  building,
  speechBubble
}: {
  state: RalphStatus['state'];
  building: string;
  speechBubble: string;
}) {
  // Position Ralph based on building
  const positions: Record<string, { gridArea: string; transform: string }> = {
    biblioteca: { gridArea: 'top', transform: 'translate(30px, 40px)' },
    taller: { gridArea: 'left', transform: 'translate(40px, 30px)' },
    hq: { gridArea: 'center', transform: 'translate(30px, 30px)' },
    banco: { gridArea: 'right', transform: 'translate(20px, 30px)' },
    torre: { gridArea: 'bottom', transform: 'translate(30px, 20px)' },
  };

  const pos = positions[building] || positions.hq;

  // Animation based on state
  const stateAnimations: Record<string, string> = {
    building: 'animate-bounce',
    thinking: 'animate-pulse',
    walking: 'animate-ping',
    idle: '',
    disconnected: 'opacity-50',
  };

  return (
    <div
      className="absolute pointer-events-none transition-all duration-500 ease-out"
      style={{
        gridArea: pos.gridArea,
        transform: pos.transform,
      }}
    >
      {/* Speech bubble */}
      {state !== 'disconnected' && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-white/90 text-slate-900 text-[10px] px-2 py-1 rounded-lg font-mono">
            {speechBubble}
          </div>
          <div className="w-2 h-2 bg-white/90 rotate-45 mx-auto -mt-1" />
        </div>
      )}

      {/* Ralph sprite */}
      <div
        className={`
          w-4 h-4 rounded-sm
          ${stateAnimations[state]}
        `}
        style={{
          backgroundColor: state === 'disconnected' ? '#666' : '#2dd4bf',
          boxShadow: state !== 'disconnected' ? '0 0 8px #2dd4bf' : 'none',
        }}
      />
    </div>
  );
}

function Sidebar({ ralph }: { ralph: RalphStatus | null }) {
  const stateLabels: Record<string, { label: string; color: string }> = {
    idle: { label: 'Esperando', color: 'text-slate-400' },
    building: { label: 'Trabajando', color: 'text-green-400' },
    thinking: { label: 'Pensando', color: 'text-purple-400' },
    walking: { label: 'Moviéndose', color: 'text-cyan-400' },
    disconnected: { label: 'Desconectado', color: 'text-red-400' },
  };

  const state = ralph?.state || 'disconnected';
  const { label, color } = stateLabels[state];

  return (
    <aside className="w-56 border-l-4 border-slate-700 bg-slate-800/80 p-4 flex flex-col gap-4 font-mono">
      {/* Status */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Estado</div>
        <div className={`text-lg font-bold ${color}`}>
          {state === 'building' && '🔨 '}
          {state === 'thinking' && '💭 '}
          {state === 'walking' && '🚶 '}
          {state === 'idle' && '💤 '}
          {state === 'disconnected' && '❌ '}
          {label}
        </div>
        <div className="text-xs text-slate-400">
          Fuente: {ralph?.source || 'N/A'}
        </div>
      </div>

      {/* Loop counter */}
      <div className="space-y-1">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Loop</div>
        <div className="text-2xl font-bold text-cyan-400">
          #{ralph?.stats.loopCount || 0}
        </div>
      </div>

      {/* Energy bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500 uppercase tracking-wider">Energía</span>
          <span className="text-yellow-400">
            {ralph?.energy.current || 0}/{ralph?.energy.max || 50}
          </span>
        </div>
        <div className="h-4 bg-slate-700 rounded overflow-hidden border-2 border-slate-600">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-300"
            style={{
              width: `${((ralph?.energy.current || 0) / (ralph?.energy.max || 50)) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Stats</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-orange-400 font-bold">{ralph?.stats.tasksPending || 0}</div>
            <div className="text-[10px] text-slate-400">Pendientes</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-green-400 font-bold">{ralph?.stats.tasksCompleted || 0}</div>
            <div className="text-[10px] text-slate-400">Completadas</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-purple-400 font-bold">{ralph?.stats.ideasCount || 0}</div>
            <div className="text-[10px] text-slate-400">Ideas</div>
          </div>
          <div className="bg-slate-700/50 p-2 rounded">
            <div className="text-red-400 font-bold">{ralph?.stats.remindersCount || 0}</div>
            <div className="text-[10px] text-slate-400">Recordatorios</div>
          </div>
        </div>
      </div>

      {/* Current task */}
      <div className="space-y-1 flex-1">
        <div className="text-xs text-slate-500 uppercase tracking-wider">Tarea actual</div>
        <div className="text-xs text-slate-300 bg-slate-700/50 p-2 rounded">
          {ralph?.currentTask || 'Sin tarea'}
        </div>
      </div>

      {/* Last update */}
      <div className="text-[10px] text-slate-600 text-center">
        Actualización cada 5s
      </div>
    </aside>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const [ralph, setRalph] = useState<RalphStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch real data from /api/ralph
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/ralph');
        if (res.ok) {
          const data = await res.json();
          setRalph(data);
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Error fetching Ralph status:', err);
        setRalph(prev => prev ? { ...prev, state: 'disconnected' } : null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const ralphBuilding = ralph ? getRalphBuilding(ralph.state) : 'hq';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex font-mono">
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
            <div className={`px-3 py-1 rounded text-xs border-2 ${
              ralph?.state === 'disconnected'
                ? 'border-red-500 text-red-400 bg-red-500/20'
                : 'border-green-500 text-green-400 bg-green-500/20'
            }`}>
              {ralph?.state === 'disconnected' ? '○ Offline' : '● Online'}
            </div>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 flex items-center justify-center p-8">
          {loading ? (
            <div className="text-slate-500">Cargando...</div>
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
                gap: '24px',
                width: '400px',
                height: '350px',
              }}
            >
              {/* Ground pattern */}
              <div
                className="absolute inset-4 rounded-lg opacity-30"
                style={{
                  background: `
                    repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 20px,
                      #1a2f1a 20px,
                      #1a2f1a 21px
                    ),
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 20px,
                      #1a2f1a 20px,
                      #1a2f1a 21px
                    ),
                    #243524
                  `,
                }}
              />

              {/* Buildings */}
              {BUILDINGS.map(building => (
                <div
                  key={building.id}
                  className="flex items-center justify-center"
                  style={{ gridArea: building.position }}
                >
                  <Building
                    building={building}
                    stat={building.statKey ? (ralph?.stats[building.statKey as keyof RalphStatus['stats']] as number) : null}
                    isActive={ralphBuilding === building.id}
                    onClick={() => router.push(building.route)}
                  />
                </div>
              ))}

              {/* Ralph */}
              <Ralph
                state={ralph?.state || 'disconnected'}
                building={ralphBuilding}
                speechBubble={ralph?.speechBubble || '...'}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pb-4 text-slate-600 text-xs">
          Click en un edificio para navegar • Ralph se mueve con actividad real
          {lastUpdate && (
            <span className="ml-2 text-slate-700">
              (última actualización: {lastUpdate.toLocaleTimeString()})
            </span>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <Sidebar ralph={ralph} />
    </div>
  );
}
