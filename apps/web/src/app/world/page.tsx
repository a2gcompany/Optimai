'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Wrench, Landmark, BookOpen, Bell, Settings,
  User, Zap, Coins, Activity, ArrowLeft, Users
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Building {
  id: string;
  name: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  stats?: { count: number; label: string };
}

interface RalphState {
  position: string; // building id where Ralph is
  status: 'idle' | 'working' | 'thinking';
  task: string;
}

// ============================================================================
// BUILDINGS CONFIG
// ============================================================================

const BUILDINGS: Building[] = [
  {
    id: 'hq',
    name: 'HQ',
    route: '/',
    icon: Building2,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/50',
    description: 'Dashboard principal',
  },
  {
    id: 'workshop',
    name: 'Taller',
    route: '/tasks',
    icon: Wrench,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50',
    description: 'Gestión de tareas',
  },
  {
    id: 'bank',
    name: 'Banco',
    route: '/finance',
    icon: Landmark,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/50',
    description: 'Finanzas y transacciones',
  },
  {
    id: 'library',
    name: 'Biblioteca',
    route: '/ideas',
    icon: BookOpen,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/50',
    description: 'Ideas y proyectos',
  },
  {
    id: 'tower',
    name: 'Torre',
    route: '/reminders',
    icon: Bell,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50',
    description: 'Recordatorios',
  },
  {
    id: 'config',
    name: 'Config',
    route: '/settings',
    icon: Settings,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20 hover:bg-slate-500/30 border-slate-500/50',
    description: 'Configuración',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ tasks: 0, ideas: 0, reminders: 0 });
  const [energy, setEnergy] = useState({ current: 45, max: 50 });
  const [coins, setCoins] = useState(127);
  const [ralph, setRalph] = useState<RalphState>({
    position: 'hq',
    status: 'idle',
    task: 'Esperando instrucciones...'
  });
  const [isConnected, setIsConnected] = useState(true);

  // Fetch Ralph status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/ralph');
        if (res.ok) {
          const data = await res.json();
          setEnergy({ current: data.energy?.current || 45, max: data.energy?.max || 50 });
          setCoins(data.stats?.tasksCompleted || 0);
          setStats({
            tasks: data.stats?.tasksPending || 0,
            ideas: data.stats?.ideasCount || 0,
            reminders: data.stats?.remindersCount || 0,
          });
          setRalph({
            position: data.state === 'building' ? 'workshop' : 'hq',
            status: data.state === 'building' ? 'working' : data.state === 'thinking' ? 'thinking' : 'idle',
            task: data.currentTask || 'Esperando...'
          });
          setIsConnected(data.state !== 'disconnected');
        }
      } catch {
        setIsConnected(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update building stats
  const buildingsWithStats = BUILDINGS.map(b => {
    if (b.id === 'workshop') return { ...b, stats: { count: stats.tasks, label: 'tareas' } };
    if (b.id === 'library') return { ...b, stats: { count: stats.ideas, label: 'ideas' } };
    if (b.id === 'tower') return { ...b, stats: { count: stats.reminders, label: 'alertas' } };
    return b;
  });

  const handleBuildingClick = (building: Building) => {
    router.push(building.route);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <h1 className="text-xl font-bold">Pueblo de Aitzol</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </div>

            {/* Energy */}
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-mono text-sm">{energy.current}/{energy.max}</span>
            </div>

            {/* Coins */}
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-mono text-sm">{coins}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Ralph Status */}
        <div className="mb-8 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              ralph.status === 'working' ? 'bg-green-500' :
              ralph.status === 'thinking' ? 'bg-yellow-500' : 'bg-cyan-500'
            }`}>
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold">Ralph</h2>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  ralph.status === 'working' ? 'bg-green-500/20 text-green-400' :
                  ralph.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {ralph.status === 'working' ? 'Trabajando' :
                   ralph.status === 'thinking' ? 'Pensando' : 'Disponible'}
                </span>
              </div>
              <p className="text-sm text-slate-400">{ralph.task}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              En: <span className="text-white">{BUILDINGS.find(b => b.id === ralph.position)?.name || 'HQ'}</span>
            </div>
          </div>
        </div>

        {/* Buildings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {buildingsWithStats.map((building) => {
            const Icon = building.icon;
            const isRalphHere = ralph.position === building.id;

            return (
              <button
                key={building.id}
                onClick={() => handleBuildingClick(building)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${building.bgColor} group`}
              >
                {/* Ralph indicator */}
                {isRalphHere && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                    <User className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Stats badge */}
                {building.stats && building.stats.count > 0 && (
                  <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-red-500 rounded-full text-xs font-bold">
                    {building.stats.count}
                  </div>
                )}

                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl bg-slate-800/50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-8 h-8 ${building.color}`} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-lg">{building.name}</h3>
                    <p className="text-sm text-slate-400">{building.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Activity Log */}
        <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold">Actividad Reciente</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-slate-500 font-mono">Ahora</span>
              <span>Sistema iniciado correctamente</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-slate-500 font-mono">-1m</span>
              <span>Ralph disponible para tareas</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-slate-500 font-mono">-2m</span>
              <span>Conexión establecida</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          Click en cualquier edificio para navegar
        </div>
      </main>
    </div>
  );
}
