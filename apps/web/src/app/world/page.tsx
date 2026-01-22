'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Building {
  id: string;
  name: string;
  route: string;
  gridX: number;
  gridY: number;
  color: string;
  roofColor: string;
  width: number;
  height: number;
  emoji: string;
}

interface Task {
  id: string;
  title: string;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  color: string;
}

interface RalphState {
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  status: 'idle' | 'working' | 'walking';
  task: string;
  frame: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 12;

// Color palette (dark theme, pixel art style)
const COLORS = {
  grass1: '#1a2f1a',
  grass2: '#243524',
  grass3: '#1e3a1e',
  path: '#3d3225',
  pathLight: '#4a3d2e',
  water: '#1a3a4a',
};

const BUILDINGS: Building[] = [
  { id: 'hq', name: 'HQ', route: '/', gridX: 5, gridY: 5, color: '#2dd4bf', roofColor: '#14b8a6', width: 2, height: 2, emoji: '🏛️' },
  { id: 'workshop', name: 'Taller', route: '/tasks', gridX: 8, gridY: 3, color: '#fb923c', roofColor: '#f97316', width: 2, height: 1, emoji: '🔧' },
  { id: 'bank', name: 'Banco', route: '/finance', gridX: 2, gridY: 4, color: '#4ade80', roofColor: '#22c55e', width: 1, height: 2, emoji: '🏦' },
  { id: 'library', name: 'Biblioteca', route: '/ideas', gridX: 3, gridY: 8, color: '#c084fc', roofColor: '#a855f7', width: 2, height: 1, emoji: '📚' },
  { id: 'tower', name: 'Torre', route: '/reminders', gridX: 9, gridY: 7, color: '#f87171', roofColor: '#ef4444', width: 1, height: 1, emoji: '🗼' },
  { id: 'config', name: 'Config', route: '/settings', gridX: 7, gridY: 9, color: '#94a3b8', roofColor: '#64748b', width: 1, height: 1, emoji: '⚙️' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isoToScreen(gridX: number, gridY: number, offsetX: number, offsetY: number): { x: number; y: number } {
  const x = (gridX - gridY) * (TILE_WIDTH / 2) + offsetX;
  const y = (gridX + gridY) * (TILE_HEIGHT / 2) + offsetY;
  return { x, y };
}

function screenToIso(screenX: number, screenY: number, offsetX: number, offsetY: number): { gridX: number; gridY: number } {
  const x = screenX - offsetX;
  const y = screenY - offsetY;
  const gridX = (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2;
  const gridY = (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2;
  return { gridX: Math.floor(gridX), gridY: Math.floor(gridY) };
}

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  strokeColor?: string
) {
  ctx.beginPath();
  ctx.moveTo(x, y - TILE_HEIGHT / 2);
  ctx.lineTo(x + TILE_WIDTH / 2, y);
  ctx.lineTo(x, y + TILE_HEIGHT / 2);
  ctx.lineTo(x - TILE_WIDTH / 2, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  offsetX: number,
  offsetY: number,
  isHovered: boolean,
  hasRalph: boolean
) {
  const { x, y } = isoToScreen(building.gridX, building.gridY, offsetX, offsetY);
  const buildingHeight = 40 + (building.id === 'tower' ? 30 : building.id === 'hq' ? 20 : 0);
  const scale = isHovered ? 1.05 : 1;

  ctx.save();
  if (isHovered) {
    ctx.shadowColor = building.color;
    ctx.shadowBlur = 20;
  }

  // Building base (darker)
  const baseColor = building.color + '80';
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (TILE_WIDTH / 2) * building.width * scale, y + (TILE_HEIGHT / 2) * building.width);
  ctx.lineTo(x + (TILE_WIDTH / 2) * building.width * scale, y + (TILE_HEIGHT / 2) * building.width - buildingHeight * scale);
  ctx.lineTo(x, y - buildingHeight * scale);
  ctx.closePath();
  ctx.fill();

  // Building left wall
  ctx.fillStyle = building.color + 'a0';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - (TILE_WIDTH / 2) * building.height * scale, y + (TILE_HEIGHT / 2) * building.height);
  ctx.lineTo(x - (TILE_WIDTH / 2) * building.height * scale, y + (TILE_HEIGHT / 2) * building.height - buildingHeight * scale);
  ctx.lineTo(x, y - buildingHeight * scale);
  ctx.closePath();
  ctx.fill();

  // Building roof
  ctx.fillStyle = building.roofColor;
  ctx.beginPath();
  const roofY = y - buildingHeight * scale;
  ctx.moveTo(x, roofY - (TILE_HEIGHT / 2) * Math.max(building.width, building.height) / 2);
  ctx.lineTo(x + (TILE_WIDTH / 2) * building.width * scale, roofY + (TILE_HEIGHT / 4) * building.width);
  ctx.lineTo(x + (TILE_WIDTH / 2) * (building.width - building.height) * scale, roofY + (TILE_HEIGHT / 2) * Math.max(building.width, building.height));
  ctx.lineTo(x - (TILE_WIDTH / 2) * building.height * scale, roofY + (TILE_HEIGHT / 4) * building.height);
  ctx.closePath();
  ctx.fill();

  // Emoji icon
  ctx.font = `${24 * scale}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(building.emoji, x, y - buildingHeight * scale - 10);

  // Building name
  if (isHovered) {
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(building.name, x, y - buildingHeight * scale - 35);
  }

  // Ralph indicator
  if (hasRalph) {
    ctx.fillStyle = '#2dd4bf';
    ctx.beginPath();
    ctx.arc(x + 20, y - buildingHeight * scale - 5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText('R', x + 20, y - buildingHeight * scale - 4);
  }

  ctx.restore();
}

function drawRalph(
  ctx: CanvasRenderingContext2D,
  ralph: RalphState,
  offsetX: number,
  offsetY: number,
  frame: number
) {
  const { x, y } = isoToScreen(ralph.gridX, ralph.gridY, offsetX, offsetY);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body bounce animation
  const bounce = ralph.status === 'walking' ? Math.sin(frame * 0.3) * 3 : Math.sin(frame * 0.1) * 1;

  // Body
  ctx.fillStyle = '#2dd4bf';
  ctx.beginPath();
  ctx.ellipse(x, y - 15 + bounce, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x, y - 32 + bounce, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  const eyeOffset = ralph.status === 'working' ? Math.sin(frame * 0.2) : 0;
  ctx.beginPath();
  ctx.arc(x - 3 + eyeOffset, y - 34 + bounce, 2, 0, Math.PI * 2);
  ctx.arc(x + 3 + eyeOffset, y - 34 + bounce, 2, 0, Math.PI * 2);
  ctx.fill();

  // Status indicator
  if (ralph.status === 'working') {
    // Hammer animation
    const hammerAngle = Math.sin(frame * 0.4) * 0.5;
    ctx.save();
    ctx.translate(x + 15, y - 25 + bounce);
    ctx.rotate(hammerAngle);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-2, -15, 4, 12);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-4, -20, 8, 6);
    ctx.restore();
  }

  // Name tag
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Ralph', x, y - 45 + bounce);
}

function drawTask(
  ctx: CanvasRenderingContext2D,
  task: Task,
  offsetX: number,
  offsetY: number,
  frame: number
) {
  const { x, y } = isoToScreen(task.gridX, task.gridY, offsetX, offsetY);
  const bounce = Math.sin(frame * 0.15 + task.gridX) * 3;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Task creature body
  ctx.fillStyle = task.color;
  ctx.beginPath();
  ctx.ellipse(x, y - 10 + bounce, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - 3, y - 12 + bounce, 3, 0, Math.PI * 2);
  ctx.arc(x + 3, y - 12 + bounce, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x - 3, y - 12 + bounce, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 3, y - 12 + bounce, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDecorations(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number
) {
  // Trees
  const trees = [
    { x: 1, y: 1 }, { x: 10, y: 1 }, { x: 1, y: 10 }, { x: 10, y: 10 },
    { x: 0, y: 6 }, { x: 11, y: 5 }, { x: 6, y: 0 }, { x: 5, y: 11 },
  ];

  trees.forEach(tree => {
    const { x, y } = isoToScreen(tree.x, tree.y, offsetX, offsetY);

    // Trunk
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 3, y - 25, 6, 20);

    // Foliage (triangular)
    ctx.fillStyle = '#2d5a27';
    ctx.beginPath();
    ctx.moveTo(x, y - 50);
    ctx.lineTo(x + 15, y - 20);
    ctx.lineTo(x - 15, y - 20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3d7a37';
    ctx.beginPath();
    ctx.moveTo(x, y - 60);
    ctx.lineTo(x + 12, y - 35);
    ctx.lineTo(x - 12, y - 35);
    ctx.closePath();
    ctx.fill();
  });

  // Rocks
  const rocks = [
    { x: 2, y: 2 }, { x: 9, y: 2 }, { x: 2, y: 9 },
  ];

  rocks.forEach(rock => {
    const { x, y } = isoToScreen(rock.x, rock.y, offsetX, offsetY);
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.ellipse(x, y - 5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#718096';
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 7, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const frameRef = useRef(0);

  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [energy, setEnergy] = useState({ current: 45, max: 50 });
  const [coins, setCoins] = useState(127);
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Revisar código', gridX: 4, gridY: 3, targetX: 8, targetY: 3, color: '#fb923c' },
    { id: '2', title: 'Enviar email', gridX: 6, gridY: 7, targetX: 5, targetY: 5, color: '#2dd4bf' },
    { id: '3', title: 'Actualizar docs', gridX: 8, gridY: 6, targetX: 3, targetY: 8, color: '#c084fc' },
  ]);
  const [ralph, setRalph] = useState<RalphState>({
    gridX: 5.5,
    gridY: 5.5,
    targetX: 5.5,
    targetY: 5.5,
    status: 'idle',
    task: 'Esperando instrucciones...',
    frame: 0,
  });
  const [isConnected, setIsConnected] = useState(true);
  const [taskList, setTaskList] = useState<Array<{ id: string; title: string; status: string }>>([]);

  // Fetch status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/ralph');
        if (res.ok) {
          const data = await res.json();
          setEnergy({ current: data.energy?.current || 45, max: data.energy?.max || 50 });
          setCoins(data.stats?.tasksCompleted || 0);

          // Update Ralph based on state
          const newStatus = data.state === 'building' ? 'working' : 'idle';
          setRalph(prev => ({
            ...prev,
            status: newStatus,
            task: data.currentTask || 'Esperando...'
          }));
          setIsConnected(data.state !== 'disconnected');

          // Get task list if available
          if (data.activity) {
            setTaskList(data.activity.slice(0, 5).map((a: { action: string }, i: number) => ({
              id: String(i),
              title: a.action,
              status: 'pending'
            })));
          }
        }
      } catch {
        setIsConnected(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Move tasks slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        const dx = task.targetX - task.gridX;
        const dy = task.targetY - task.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
          // Pick new random target
          return {
            ...task,
            targetX: 2 + Math.random() * 8,
            targetY: 2 + Math.random() * 8,
          };
        }

        return {
          ...task,
          gridX: task.gridX + (dx / dist) * 0.05,
          gridY: task.gridY + (dy / dist) * 0.05,
        };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const offsetX = canvas.width / 2;
    const offsetY = 100;

    // Check building clicks
    for (const building of BUILDINGS) {
      const pos = isoToScreen(building.gridX, building.gridY, offsetX, offsetY);
      const buildingHeight = 40 + (building.id === 'tower' ? 30 : building.id === 'hq' ? 20 : 0);

      // Simple bounding box check
      if (
        x > pos.x - TILE_WIDTH / 2 * building.width &&
        x < pos.x + TILE_WIDTH / 2 * building.width &&
        y > pos.y - buildingHeight - 30 &&
        y < pos.y + TILE_HEIGHT / 2 * building.height
      ) {
        router.push(building.route);
        return;
      }
    }
  }, [router]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const offsetX = canvas.width / 2;
    const offsetY = 100;

    let found: string | null = null;
    for (const building of BUILDINGS) {
      const pos = isoToScreen(building.gridX, building.gridY, offsetX, offsetY);
      const buildingHeight = 40 + (building.id === 'tower' ? 30 : building.id === 'hq' ? 20 : 0);

      if (
        x > pos.x - TILE_WIDTH / 2 * building.width &&
        x < pos.x + TILE_WIDTH / 2 * building.width &&
        y > pos.y - buildingHeight - 30 &&
        y < pos.y + TILE_HEIGHT / 2 * building.height
      ) {
        found = building.id;
        break;
      }
    }
    setHoveredBuilding(found);
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;

      // Clear
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const offsetX = canvas.width / 2;
      const offsetY = 100;

      // Draw grid tiles
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const pos = isoToScreen(x, y, offsetX, offsetY);

          // Determine tile color
          let color = COLORS.grass1;
          if ((x + y) % 2 === 0) color = COLORS.grass2;
          if ((x + y) % 3 === 0) color = COLORS.grass3;

          // Paths between buildings
          const isPath = (
            (x >= 4 && x <= 6 && y >= 4 && y <= 6) || // Center area
            (x === 5 && y < 5) || (y === 5 && x < 5) || // Paths from center
            (x === 5 && y > 6) || (y === 5 && x > 6) ||
            (x === 8 && y === 3) || (x === 2 && y === 4) || // Building connections
            (x === 3 && y === 8) || (x === 9 && y === 7)
          );

          if (isPath) color = COLORS.path;

          drawIsometricTile(ctx, pos.x, pos.y, color, '#1e293b20');
        }
      }

      // Draw decorations
      drawDecorations(ctx, offsetX, offsetY);

      // Draw buildings (sorted by y for proper overlap)
      const sortedBuildings = [...BUILDINGS].sort((a, b) => (a.gridX + a.gridY) - (b.gridX + b.gridY));
      sortedBuildings.forEach(building => {
        const isHovered = hoveredBuilding === building.id;
        const hasRalph = Math.abs(ralph.gridX - building.gridX) < 1 && Math.abs(ralph.gridY - building.gridY) < 1;
        drawBuilding(ctx, building, offsetX, offsetY, isHovered, hasRalph);
      });

      // Draw tasks
      tasks.forEach(task => {
        drawTask(ctx, task, offsetX, offsetY, frame);
      });

      // Draw Ralph
      drawRalph(ctx, ralph, offsetX, offsetY, frame);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hoveredBuilding, ralph, tasks]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.min(window.innerWidth, 900);
      canvas.height = 600;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-slate-400 hover:text-white transition-colors font-mono text-sm"
              >
                ← Dashboard
              </button>
              <h1 className="text-lg font-bold font-mono">🏘️ Pueblo de Aitzol</h1>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-mono ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {isConnected ? '● Online' : '○ Offline'}
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            className="cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Footer hint */}
        <div className="text-center pb-4 text-slate-500 text-sm font-mono">
          Click en un edificio para navegar
        </div>
      </div>

      {/* Side Panel */}
      <aside className="w-64 border-l border-slate-700 bg-slate-800/50 p-4 flex flex-col gap-4">
        {/* Ralph Status */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
              ralph.status === 'working' ? 'bg-green-500' : 'bg-cyan-500'
            }`}>
              🤖
            </div>
            <div>
              <div className="font-bold text-sm">Ralph</div>
              <div className={`text-xs ${
                ralph.status === 'working' ? 'text-green-400' : 'text-cyan-400'
              }`}>
                {ralph.status === 'working' ? '🔨 Trabajando' : '💤 Disponible'}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 truncate">{ralph.task}</div>
        </div>

        {/* Energy Bar */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">⚡ Energía</span>
            <span className="text-xs font-mono text-yellow-400">{energy.current}/{energy.max}</span>
          </div>
          <div className="h-3 bg-slate-600 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all"
              style={{ width: `${(energy.current / energy.max) * 100}%` }}
            />
          </div>
        </div>

        {/* Coins */}
        <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">🪙 Monedas</span>
          <span className="font-mono text-amber-400 font-bold">{coins}</span>
        </div>

        {/* Task List */}
        <div className="bg-slate-700/50 rounded-lg p-3 flex-1">
          <div className="text-xs text-slate-400 mb-2">📋 Tareas activas</div>
          <div className="space-y-2">
            {taskList.length > 0 ? (
              taskList.map((task, i) => (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    i === 0 ? 'bg-green-400' : 'bg-slate-500'
                  }`} />
                  <span className="text-slate-300 truncate">{task.title}</span>
                </div>
              ))
            ) : (
              <>
                {tasks.map((task, i) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.color }} />
                    <span className="text-slate-300 truncate">{task.title}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2">🏠 Edificios</div>
          <div className="grid grid-cols-2 gap-1">
            {BUILDINGS.map(b => (
              <button
                key={b.id}
                onClick={() => router.push(b.route)}
                className="text-xs p-1.5 rounded hover:bg-slate-600 transition-colors text-left"
              >
                {b.emoji} {b.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
