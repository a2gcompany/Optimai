'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Task } from '@/lib/api';

// Types
interface Building {
  id: string;
  name: string;
  route: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
  stats?: { count: number; label: string };
}

interface TaskAgent {
  id: string;
  title: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  building: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

// Isometric helpers
function toIso(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y) * 0.866,
    y: (x + y) * 0.5,
  };
}

function fromIso(isoX: number, isoY: number): { x: number; y: number } {
  return {
    x: isoX / 0.866 / 2 + isoY,
    y: isoY - isoX / 0.866 / 2,
  };
}

// Pixel art building drawing
function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  offsetX: number,
  offsetY: number,
  scale: number,
  isHovered: boolean
) {
  const { x, y, width, height, color, icon, name, stats } = building;

  // Convert to isometric
  const iso = toIso(x, y);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  const w = width * scale * 0.866;
  const h = height * scale * 0.5;
  const buildingHeight = 60 * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + buildingHeight + 10);
  ctx.lineTo(screenX + w, screenY + h + buildingHeight + 10);
  ctx.lineTo(screenX, screenY + h * 2 + buildingHeight + 10);
  ctx.lineTo(screenX - w, screenY + h + buildingHeight + 10);
  ctx.closePath();
  ctx.fill();

  // Parse color
  const baseColor = color;
  const darkColor = adjustBrightness(color, -30);
  const lightColor = adjustBrightness(color, 20);

  // Left face (darker)
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(screenX - w, screenY + h);
  ctx.lineTo(screenX, screenY + h * 2);
  ctx.lineTo(screenX, screenY + h * 2 + buildingHeight);
  ctx.lineTo(screenX - w, screenY + h + buildingHeight);
  ctx.closePath();
  ctx.fill();

  // Right face (medium)
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.moveTo(screenX + w, screenY + h);
  ctx.lineTo(screenX, screenY + h * 2);
  ctx.lineTo(screenX, screenY + h * 2 + buildingHeight);
  ctx.lineTo(screenX + w, screenY + h + buildingHeight);
  ctx.closePath();
  ctx.fill();

  // Top face (lightest)
  ctx.fillStyle = isHovered ? adjustBrightness(lightColor, 20) : lightColor;
  ctx.beginPath();
  ctx.moveTo(screenX, screenY);
  ctx.lineTo(screenX + w, screenY + h);
  ctx.lineTo(screenX, screenY + h * 2);
  ctx.lineTo(screenX - w, screenY + h);
  ctx.closePath();
  ctx.fill();

  // Outline
  ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = isHovered ? 2 : 1;
  ctx.stroke();

  // Windows (pixel art style)
  const windowSize = 8 * scale;
  const windowGap = 12 * scale;
  ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      // Right face windows
      const wx = screenX + w * 0.3 + col * windowGap;
      const wy = screenY + h + 15 * scale + row * (windowSize + 5 * scale);
      ctx.fillRect(wx, wy, windowSize * 0.7, windowSize);

      // Left face windows
      const lwx = screenX - w * 0.7 + col * windowGap;
      ctx.fillRect(lwx, wy, windowSize * 0.7, windowSize);
    }
  }

  // Icon on top
  ctx.font = `${24 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(icon, screenX, screenY + h - 5 * scale);

  // Name label
  ctx.font = `bold ${11 * scale}px "SF Mono", monospace`;
  ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.8)';
  ctx.fillText(name, screenX, screenY + h * 2 + buildingHeight + 20 * scale);

  // Stats badge
  if (stats && stats.count > 0) {
    const badgeX = screenX + w * 0.5;
    const badgeY = screenY - 5 * scale;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${10 * scale}px Arial`;
    ctx.fillText(String(stats.count), badgeX, badgeY + 4 * scale);
  }

  // Hover glow
  if (isHovered) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Draw task agent (small character)
function drawAgent(
  ctx: CanvasRenderingContext2D,
  agent: TaskAgent,
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  const iso = toIso(agent.x, agent.y);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  // Bobbing animation
  const bob = Math.sin(frame * 0.1 + agent.x) * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 12 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (pixel art style)
  const size = 8 * scale;

  // Body
  ctx.fillStyle = agent.color;
  ctx.fillRect(screenX - size / 2, screenY - size + bob, size, size * 1.2);

  // Head
  ctx.fillStyle = '#fcd5ce';
  ctx.fillRect(screenX - size / 3, screenY - size * 1.5 + bob, size * 0.66, size * 0.6);

  // Eyes
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(screenX - 2 * scale, screenY - size * 1.3 + bob, 2 * scale, 2 * scale);
  ctx.fillRect(screenX + 1 * scale, screenY - size * 1.3 + bob, 2 * scale, 2 * scale);
}

// Draw completion particle effect
function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  offsetX: number,
  offsetY: number,
  scale: number
) {
  for (const p of particles) {
    const iso = toIso(p.x, p.y);
    const screenX = iso.x * scale + offsetX;
    const screenY = iso.y * scale + offsetY;

    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 3 * scale * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Color helpers
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Draw ground grid
function drawGround(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  scale: number,
  width: number,
  height: number
) {
  const gridSize = 50;
  const gridCount = 20;

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
  ctx.lineWidth = 1;

  for (let i = -gridCount; i <= gridCount; i++) {
    // Horizontal lines
    const start1 = toIso(-gridCount * gridSize, i * gridSize);
    const end1 = toIso(gridCount * gridSize, i * gridSize);
    ctx.beginPath();
    ctx.moveTo(start1.x * scale + offsetX, start1.y * scale + offsetY);
    ctx.lineTo(end1.x * scale + offsetX, end1.y * scale + offsetY);
    ctx.stroke();

    // Vertical lines
    const start2 = toIso(i * gridSize, -gridCount * gridSize);
    const end2 = toIso(i * gridSize, gridCount * gridSize);
    ctx.beginPath();
    ctx.moveTo(start2.x * scale + offsetX, start2.y * scale + offsetY);
    ctx.lineTo(end2.x * scale + offsetX, end2.y * scale + offsetY);
    ctx.stroke();
  }
}

export default function WorldPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [stats, setStats] = useState({ tasks: 0, ideas: 0, reminders: 0, transactions: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const frameRef = useRef(0);
  const agentsRef = useRef<TaskAgent[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Buildings configuration
  const buildings: Building[] = [
    { id: 'core', name: 'CORE', route: '/', x: 0, y: 0, width: 80, height: 80, color: '#6366f1', icon: '🏠' },
    { id: 'tasks', name: 'TAREAS', route: '/tasks', x: 150, y: 0, width: 70, height: 70, color: '#22c55e', icon: '✓', stats: { count: stats.tasks, label: 'pending' } },
    { id: 'finance', name: 'FINANZAS', route: '/finance', x: 0, y: 150, width: 70, height: 70, color: '#f59e0b', icon: '💰', stats: { count: stats.transactions, label: 'this month' } },
    { id: 'ideas', name: 'IDEAS', route: '/ideas', x: 150, y: 150, width: 70, height: 70, color: '#ec4899', icon: '💡', stats: { count: stats.ideas, label: 'total' } },
    { id: 'reminders', name: 'RECORDATORIOS', route: '/reminders', x: 300, y: 75, width: 60, height: 60, color: '#8b5cf6', icon: '🔔', stats: { count: stats.reminders, label: 'pending' } },
    { id: 'settings', name: 'CONFIG', route: '/settings', x: -100, y: 75, width: 50, height: 50, color: '#64748b', icon: '⚙️' },
  ];

  // Load stats
  useEffect(() => {
    async function loadStats() {
      try {
        const [taskStats, reminderStats, financeStats] = await Promise.all([
          api.getTaskStats(),
          api.getReminderStats(),
          api.getFinanceSummary(),
        ]);

        const ideas = await api.getIdeas(100);
        const taskList = await api.getTasks(10);

        setStats({
          tasks: taskStats.pending,
          ideas: ideas.filter(i => i.status !== 'done').length,
          reminders: reminderStats.pending,
          transactions: financeStats.transactionCount,
        });

        setTasks(taskList.filter(t => t.status === 'in_progress' || t.status === 'pending').slice(0, 5));
      } catch (e) {
        console.error('Error loading stats:', e);
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize agents from tasks
  useEffect(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
    agentsRef.current = tasks.map((task, i) => {
      const buildingIdx = Math.floor(Math.random() * 4) + 1;
      const targetBuilding = buildings[buildingIdx];
      return {
        id: task.id,
        title: task.title,
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        targetX: targetBuilding.x + Math.random() * 40 - 20,
        targetY: targetBuilding.y + Math.random() * 40 - 20,
        speed: 0.5 + Math.random() * 0.5,
        color: colors[i % colors.length],
        building: targetBuilding.id,
      };
    });
  }, [tasks]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const scale = 1;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!ctx || !canvas) return;

      frameRef.current++;
      const frame = frameRef.current;

      const offsetX = canvas.width / 2;
      const offsetY = canvas.height / 2 - 50;

      // Clear with dark background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 100; i++) {
        const sx = (i * 137.5) % canvas.width;
        const sy = (i * 97.3 + frame * 0.02) % canvas.height;
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Draw ground grid
      drawGround(ctx, offsetX, offsetY, scale, canvas.width, canvas.height);

      // Sort buildings by depth for proper drawing order
      const sortedBuildings = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

      // Draw buildings
      for (const building of sortedBuildings) {
        drawBuilding(ctx, building, offsetX, offsetY, scale, hoveredBuilding === building.id);
      }

      // Update and draw agents
      for (const agent of agentsRef.current) {
        // Move towards target
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
          agent.x += (dx / dist) * agent.speed;
          agent.y += (dy / dist) * agent.speed;
        } else {
          // Reached target, pick new random target near same building
          const building = buildings.find(b => b.id === agent.building);
          if (building) {
            agent.targetX = building.x + Math.random() * 60 - 30;
            agent.targetY = building.y + Math.random() * 60 - 30;
          }
        }

        drawAgent(ctx, agent, offsetX, offsetY, scale, frame);
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life -= 0.02;
        return p.life > 0;
      });
      drawParticles(ctx, particlesRef.current, offsetX, offsetY, scale);

      // Draw title
      ctx.font = 'bold 28px "SF Mono", monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('OPTIMAI WORLD', canvas.width / 2, 50);

      ctx.font = '14px "SF Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Click en un edificio para navegar', canvas.width / 2, 75);

      // Draw mini stats
      ctx.textAlign = 'left';
      ctx.font = '12px "SF Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`Tareas activas: ${stats.tasks}`, 20, canvas.height - 60);
      ctx.fillText(`Ideas pendientes: ${stats.ideas}`, 20, canvas.height - 40);
      ctx.fillText(`Recordatorios: ${stats.reminders}`, 20, canvas.height - 20);

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [hoveredBuilding, stats, buildings]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2 - 50;
    const scale = 1;

    // Check which building is hovered
    let found: string | null = null;
    for (const building of buildings) {
      const iso = toIso(building.x, building.y);
      const screenX = iso.x * scale + offsetX;
      const screenY = iso.y * scale + offsetY;
      const w = building.width * scale * 0.866;
      const h = building.height * scale * 0.5;

      // Simple bounding box check
      if (
        mouseX >= screenX - w &&
        mouseX <= screenX + w &&
        mouseY >= screenY &&
        mouseY <= screenY + h * 2 + 60 * scale
      ) {
        found = building.id;
        break;
      }
    }
    setHoveredBuilding(found);
  }, [buildings]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredBuilding) {
      const building = buildings.find(b => b.id === hoveredBuilding);
      if (building) {
        // Spawn celebration particles
        const iso = toIso(building.x, building.y);
        for (let i = 0; i < 20; i++) {
          particlesRef.current.push({
            x: building.x,
            y: building.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3,
            life: 1,
            color: building.color,
          });
        }

        // Navigate after a brief delay for effect
        setTimeout(() => {
          router.push(building.route);
        }, 150);
      }
    }
  }, [hoveredBuilding, buildings, router]);

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ cursor: hoveredBuilding ? 'pointer' : 'default' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-4 left-4 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors backdrop-blur-sm border border-slate-700"
      >
        ← Dashboard
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 p-4 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700">
        <h3 className="text-white font-semibold mb-2 text-sm">Leyenda</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-indigo-500"></div>
            <span className="text-slate-300">Core / Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-slate-300">Tareas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-slate-300">Finanzas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-pink-500"></div>
            <span className="text-slate-300">Ideas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-violet-500"></div>
            <span className="text-slate-300">Recordatorios</span>
          </div>
        </div>
      </div>

      {/* Tooltip for hovered building */}
      {hoveredBuilding && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-600 text-white text-sm">
          Click para ir a <strong>{buildings.find(b => b.id === hoveredBuilding)?.name}</strong>
        </div>
      )}
    </div>
  );
}
