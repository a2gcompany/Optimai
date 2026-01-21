'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Task } from '@/lib/api';
import { Zap, Coins, Activity, Maximize2, X, RefreshCw, Users, Map, TrendingUp, Crown } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Building {
  id: string;
  name: string;
  type: 'hq' | 'bank' | 'workshop' | 'library' | 'tower' | 'config';
  route: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roofHeight: number;
  color: string;
  accentColor: string;
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
  state: 'walking' | 'working' | 'celebrating';
  celebrateTimer: number;
}

interface RalphState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  currentTask: string;
  speechBubble: string;
  speechTimer: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  type: 'spark' | 'coin' | 'star';
}

interface EnergySystem {
  current: number;
  max: number;
  nextReset: string;
}

interface LogEntry {
  time: string;
  action: string;
  type: 'task' | 'energy' | 'coin' | 'system';
}

interface RalphAPIResponse {
  state: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  currentTask: string;
  speechBubble: string;
  energy: EnergySystem;
  stats: {
    tasksCompleted: number;
    tasksPending: number;
    ideasCount: number;
    remindersCount: number;
    loopCount: number;
    callsThisHour: number;
  };
  recentActivity: LogEntry[];
  source?: 'local' | 'supabase' | 'fallback';
  pueblo?: string;
}

// Pueblo (village) configuration
interface Pueblo {
  id: string;
  name: string;
  owner: string;
  emoji: string;
  color: string;
  accentColor: string;
  position: { x: number; y: number };
  stats: {
    energy: number;
    maxEnergy: number;
    coins: number;
    tasksCompleted: number;
    tasksPending: number;
    streak: number;
  };
  ralphState: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  isActive: boolean;
}

// Caravan for shared tasks
interface Caravan {
  id: string;
  fromPueblo: string;
  toPueblo: string;
  taskTitle: string;
  progress: number; // 0-1
  x: number;
  y: number;
  color: string;
}

// ============================================================================
// ISOMETRIC HELPERS
// ============================================================================

function toIso(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y) * 0.866,
    y: (x + y) * 0.5,
  };
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ============================================================================
// PUEBLOS DATA
// ============================================================================

const PUEBLOS_CONFIG: Pueblo[] = [
  {
    id: 'aitzol',
    name: 'Aitzol',
    owner: 'Aitzol',
    emoji: '🏔️',
    color: '#4f46e5',
    accentColor: '#818cf8',
    position: { x: 0, y: 0 },
    stats: { energy: 45, maxEnergy: 50, coins: 127, tasksCompleted: 127, tasksPending: 8, streak: 5 },
    ralphState: 'building',
    isActive: true, // Current user's pueblo
  },
  {
    id: 'alvaro',
    name: 'Alvaro',
    owner: 'Alvaro',
    emoji: '🌊',
    color: '#0891b2',
    accentColor: '#22d3ee',
    position: { x: 400, y: -100 },
    stats: { energy: 30, maxEnergy: 50, coins: 89, tasksCompleted: 89, tasksPending: 3, streak: 2 },
    ralphState: 'idle',
    isActive: false,
  },
  {
    id: 'sergi',
    name: 'Sergi',
    owner: 'Sergi',
    emoji: '🌲',
    color: '#059669',
    accentColor: '#34d399',
    position: { x: 400, y: 200 },
    stats: { energy: 50, maxEnergy: 50, coins: 156, tasksCompleted: 156, tasksPending: 12, streak: 8 },
    ralphState: 'thinking',
    isActive: false,
  },
];

// Sample shared tasks (caravans)
const CARAVANS_CONFIG: Caravan[] = [
  {
    id: 'caravan1',
    fromPueblo: 'aitzol',
    toPueblo: 'alvaro',
    taskTitle: 'Integración API',
    progress: 0.6,
    x: 200,
    y: -50,
    color: '#fbbf24',
  },
  {
    id: 'caravan2',
    fromPueblo: 'sergi',
    toPueblo: 'aitzol',
    taskTitle: 'Review PR #42',
    progress: 0.3,
    x: 200,
    y: 100,
    color: '#f472b6',
  },
];

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

function drawGround(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  const gridSize = 40;
  const gridCount = 20;

  // Draw grass tiles with subtle animation
  for (let i = -gridCount; i <= gridCount; i++) {
    for (let j = -gridCount; j <= gridCount; j++) {
      const iso = toIso(i * gridSize, j * gridSize);
      const x = iso.x * scale + offsetX;
      const y = iso.y * scale + offsetY;

      // Checkerboard grass pattern with subtle wave
      const wave = Math.sin((i + j) * 0.3 + frame * 0.02) * 0.02;
      const isLight = (i + j) % 2 === 0;
      const baseColor = isLight ? '#1a2e1a' : '#162816';
      ctx.fillStyle = adjustBrightness(baseColor, wave * 50);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + gridSize * 0.866 * scale, y + gridSize * 0.5 * scale);
      ctx.lineTo(x, y + gridSize * scale);
      ctx.lineTo(x - gridSize * 0.866 * scale, y + gridSize * 0.5 * scale);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Draw main roads connecting pueblos
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
  ctx.lineWidth = 12 * scale;
  ctx.setLineDash([15, 8]);
  ctx.lineCap = 'round';

  // Road from Aitzol to Alvaro
  const road1Start = toIso(100, -50);
  const road1End = toIso(300, -100);
  ctx.beginPath();
  ctx.moveTo(road1Start.x * scale + offsetX, road1Start.y * scale + offsetY);
  ctx.lineTo(road1End.x * scale + offsetX, road1End.y * scale + offsetY);
  ctx.stroke();

  // Road from Aitzol to Sergi
  const road2Start = toIso(100, 100);
  const road2End = toIso(300, 200);
  ctx.beginPath();
  ctx.moveTo(road2Start.x * scale + offsetX, road2Start.y * scale + offsetY);
  ctx.lineTo(road2End.x * scale + offsetX, road2End.y * scale + offsetY);
  ctx.stroke();

  // Road from Alvaro to Sergi
  const road3Start = toIso(400, 0);
  const road3End = toIso(400, 150);
  ctx.beginPath();
  ctx.moveTo(road3Start.x * scale + offsetX, road3Start.y * scale + offsetY);
  ctx.lineTo(road3End.x * scale + offsetX, road3End.y * scale + offsetY);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  building: Building,
  offsetX: number,
  offsetY: number,
  scale: number,
  isHovered: boolean,
  frame: number,
  puebloOffset: { x: number; y: number } = { x: 0, y: 0 }
) {
  const { x, y, width, height, roofHeight, color, accentColor, icon, name, type, stats } = building;

  const finalX = x + puebloOffset.x;
  const finalY = y + puebloOffset.y;

  const iso = toIso(finalX, finalY);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  const w = width * scale * 0.866;
  const h = height * scale * 0.5;
  const bh = roofHeight * scale;

  // Hover animation
  const hoverOffset = isHovered ? Math.sin(frame * 0.1) * 3 : 0;
  const hoverScale = isHovered ? 1.02 : 1;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + bh + h + 15, w * 0.8, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const darkColor = adjustBrightness(color, -40);
  const lightColor = adjustBrightness(color, 30);

  // Left wall
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.moveTo(screenX - w * hoverScale, screenY + h - hoverOffset);
  ctx.lineTo(screenX, screenY + h * 2 - hoverOffset);
  ctx.lineTo(screenX, screenY + h * 2 + bh - hoverOffset);
  ctx.lineTo(screenX - w * hoverScale, screenY + h + bh - hoverOffset);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(screenX + w * hoverScale, screenY + h - hoverOffset);
  ctx.lineTo(screenX, screenY + h * 2 - hoverOffset);
  ctx.lineTo(screenX, screenY + h * 2 + bh - hoverOffset);
  ctx.lineTo(screenX + w * hoverScale, screenY + h + bh - hoverOffset);
  ctx.closePath();
  ctx.fill();

  // Roof based on building type
  if (type === 'tower') {
    const gradient = ctx.createLinearGradient(screenX, screenY - 30 * scale, screenX, screenY + h * 2);
    gradient.addColorStop(0, accentColor);
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - 30 * scale - hoverOffset);
    ctx.lineTo(screenX + w * hoverScale, screenY + h - hoverOffset);
    ctx.lineTo(screenX, screenY + h * 2 - hoverOffset);
    ctx.lineTo(screenX - w * hoverScale, screenY + h - hoverOffset);
    ctx.closePath();
    ctx.fill();

    if (frame % 60 < 30) {
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 35 * scale - hoverOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else if (type === 'hq') {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - hoverOffset);
    ctx.lineTo(screenX + w * hoverScale, screenY + h - hoverOffset);
    ctx.lineTo(screenX, screenY + h * 2 - hoverOffset);
    ctx.lineTo(screenX - w * hoverScale, screenY + h - hoverOffset);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - hoverOffset);
    ctx.lineTo(screenX, screenY - 25 * scale - hoverOffset);
    ctx.stroke();

    if (Math.floor(frame / 30) % 2 === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(screenX, screenY - 25 * scale - hoverOffset, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else {
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - hoverOffset);
    ctx.lineTo(screenX + w * hoverScale, screenY + h - hoverOffset);
    ctx.lineTo(screenX, screenY + h * 2 - hoverOffset);
    ctx.lineTo(screenX - w * hoverScale, screenY + h - hoverOffset);
    ctx.closePath();
    ctx.fill();
  }

  // Windows
  const windowAlpha = 0.6 + Math.sin(frame * 0.05) * 0.15;
  const windowColor = `rgba(255, 255, 200, ${windowAlpha})`;
  const windowSize = 10 * scale;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const rwx = screenX + w * 0.25 + col * 15 * scale;
      const rwy = screenY + h + 12 * scale + row * 18 * scale - hoverOffset;
      ctx.fillStyle = windowColor;
      ctx.fillRect(rwx, rwy, windowSize * 0.8, windowSize);

      const lwx = screenX - w * 0.75 + col * 15 * scale;
      ctx.fillRect(lwx, rwy, windowSize * 0.8, windowSize);
    }
  }

  // Door
  ctx.fillStyle = adjustBrightness(accentColor, -20);
  ctx.fillRect(screenX - 6 * scale, screenY + h * 2 + bh - 18 * scale - hoverOffset, 12 * scale, 18 * scale);

  // Icon on roof
  ctx.font = `${28 * scale}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(icon, screenX, screenY + h - 10 * scale - hoverOffset);

  // Building name
  ctx.font = `bold ${10 * scale}px "SF Mono", monospace`;
  ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.7)';
  ctx.fillText(name, screenX, screenY + h * 2 + bh + 25 * scale);

  // Stats badge
  if (stats && stats.count > 0) {
    const badgeX = screenX + w * 0.6;
    const badgeY = screenY - 10 * scale - hoverOffset;
    const pulseScale = 1 + Math.sin(frame * 0.1) * 0.1;

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 14 * scale * pulseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${11 * scale}px Arial`;
    ctx.fillText(String(stats.count), badgeX, badgeY + 4 * scale);
  }

  // Hover glow
  if (isHovered) {
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - hoverOffset);
    ctx.lineTo(screenX + w * hoverScale, screenY + h - hoverOffset);
    ctx.lineTo(screenX + w * hoverScale, screenY + h + bh - hoverOffset);
    ctx.lineTo(screenX, screenY + h * 2 + bh - hoverOffset);
    ctx.lineTo(screenX - w * hoverScale, screenY + h + bh - hoverOffset);
    ctx.lineTo(screenX - w * hoverScale, screenY + h - hoverOffset);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawPuebloLabel(
  ctx: CanvasRenderingContext2D,
  pueblo: Pueblo,
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  const iso = toIso(pueblo.position.x + 75, pueblo.position.y - 80);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  // Glow effect for active pueblo
  if (pueblo.isActive) {
    ctx.shadowColor = pueblo.accentColor;
    ctx.shadowBlur = 20;
  }

  // Background banner
  ctx.fillStyle = pueblo.isActive ? pueblo.color : adjustBrightness(pueblo.color, -30);
  ctx.beginPath();
  ctx.roundRect(screenX - 60 * scale, screenY - 15 * scale, 120 * scale, 30 * scale, 8);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Pueblo name
  ctx.font = `bold ${14 * scale}px "SF Mono", monospace`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(`${pueblo.emoji} ${pueblo.name.toUpperCase()}`, screenX, screenY + 5 * scale);

  // Stats below
  const statsY = screenY + 25 * scale;
  ctx.font = `${10 * scale}px "SF Mono", monospace`;
  ctx.fillStyle = pueblo.accentColor;

  // Energy bar
  const barWidth = 50 * scale;
  const barHeight = 4 * scale;
  const energyPct = pueblo.stats.energy / pueblo.stats.maxEnergy;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(screenX - barWidth / 2, statsY, barWidth, barHeight);

  ctx.fillStyle = energyPct > 0.5 ? '#22c55e' : energyPct > 0.2 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(screenX - barWidth / 2, statsY, barWidth * energyPct, barHeight);

  // Coins and tasks
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`${pueblo.stats.coins}`, screenX - 25 * scale, statsY + 18 * scale);
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`${pueblo.stats.tasksPending}`, screenX + 25 * scale, statsY + 18 * scale);

  // Active indicator
  if (pueblo.isActive) {
    const pulseAlpha = 0.5 + Math.sin(frame * 0.1) * 0.3;
    ctx.strokeStyle = `rgba(${parseInt(pueblo.accentColor.slice(1, 3), 16)}, ${parseInt(pueblo.accentColor.slice(3, 5), 16)}, ${parseInt(pueblo.accentColor.slice(5, 7), 16)}, ${pulseAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(screenX - 65 * scale, screenY - 20 * scale, 130 * scale, 40 * scale, 10);
    ctx.stroke();
  }
}

function drawMiniRalph(
  ctx: CanvasRenderingContext2D,
  pueblo: Pueblo,
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  // Position Ralph near the HQ of each pueblo
  const baseX = pueblo.position.x + 50;
  const baseY = pueblo.position.y + 50;

  const iso = toIso(baseX, baseY);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  const bob = pueblo.ralphState === 'walking' ? Math.sin(frame * 0.2 + pueblo.position.x) * 2 : 0;
  const size = 8 * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 10 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body glow
  const glowColors: Record<string, string> = {
    idle: '#06b6d4',
    walking: '#3b82f6',
    building: '#22c55e',
    thinking: '#f59e0b',
    disconnected: '#64748b',
  };
  const glowColor = glowColors[pueblo.ralphState] || '#64748b';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = pueblo.ralphState === 'disconnected' ? 3 : 8;

  // Body
  ctx.fillStyle = pueblo.ralphState === 'disconnected' ? '#64748b' : pueblo.color;
  ctx.fillRect(screenX - size / 2, screenY - size + bob, size, size * 1.2);
  ctx.shadowBlur = 0;

  // Head
  ctx.fillStyle = '#fcd5ce';
  ctx.beginPath();
  ctx.arc(screenX, screenY - size * 1.3 + bob, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = pueblo.color;
  ctx.fillRect(screenX - size * 0.35, screenY - size * 1.7 + bob, size * 0.7, size * 0.25);

  // Antenna light
  const lightColor = pueblo.ralphState === 'disconnected' ? '#ef4444' :
    pueblo.ralphState === 'building' ? '#22c55e' :
    pueblo.ralphState === 'thinking' ? '#f59e0b' : pueblo.accentColor;

  ctx.fillStyle = lightColor;
  ctx.shadowColor = lightColor;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(screenX, screenY - size * 1.9 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCaravan(
  ctx: CanvasRenderingContext2D,
  caravan: Caravan,
  pueblos: Pueblo[],
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  const fromPueblo = pueblos.find(p => p.id === caravan.fromPueblo);
  const toPueblo = pueblos.find(p => p.id === caravan.toPueblo);

  if (!fromPueblo || !toPueblo) return;

  // Calculate position along path
  const fromPos = { x: fromPueblo.position.x + 100, y: fromPueblo.position.y + 50 };
  const toPos = { x: toPueblo.position.x + 50, y: toPueblo.position.y + 50 };

  const currentX = fromPos.x + (toPos.x - fromPos.x) * caravan.progress;
  const currentY = fromPos.y + (toPos.y - fromPos.y) * caravan.progress;

  const iso = toIso(currentX, currentY);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  const bob = Math.sin(frame * 0.1) * 2;

  // Draw caravan (cart with goods)
  // Wheels
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.arc(screenX - 8 * scale, screenY + 5 * scale + bob, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(screenX + 8 * scale, screenY + 5 * scale + bob, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Cart body
  ctx.fillStyle = caravan.color;
  ctx.shadowColor = caravan.color;
  ctx.shadowBlur = 8;
  ctx.fillRect(screenX - 12 * scale, screenY - 8 * scale + bob, 24 * scale, 12 * scale);
  ctx.shadowBlur = 0;

  // Cargo
  ctx.fillStyle = adjustBrightness(caravan.color, -30);
  ctx.fillRect(screenX - 8 * scale, screenY - 16 * scale + bob, 16 * scale, 8 * scale);

  // Flag
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX, screenY - 16 * scale + bob);
  ctx.lineTo(screenX, screenY - 28 * scale + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screenX, screenY - 28 * scale + bob);
  ctx.lineTo(screenX + 10 * scale, screenY - 24 * scale + bob);
  ctx.lineTo(screenX, screenY - 20 * scale + bob);
  ctx.closePath();
  ctx.fill();

  // Task label
  ctx.font = `${8 * scale}px "SF Mono", monospace`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(caravan.taskTitle.substring(0, 15), screenX, screenY - 32 * scale + bob);

  // Progress indicator
  const progressWidth = 30 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(screenX - progressWidth / 2, screenY + 15 * scale, progressWidth, 3 * scale);
  ctx.fillStyle = caravan.color;
  ctx.fillRect(screenX - progressWidth / 2, screenY + 15 * scale, progressWidth * caravan.progress, 3 * scale);
}

function drawRalph(
  ctx: CanvasRenderingContext2D,
  ralph: RalphState,
  offsetX: number,
  offsetY: number,
  scale: number,
  frame: number
) {
  const iso = toIso(ralph.x, ralph.y);
  const screenX = iso.x * scale + offsetX;
  const screenY = iso.y * scale + offsetY;

  const bob = ralph.state === 'walking' ? Math.sin(frame * 0.2) * 3 : 0;
  const size = 12 * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 15 * scale, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body glow
  const glowColors: Record<string, string> = {
    idle: '#06b6d4',
    walking: '#3b82f6',
    building: '#22c55e',
    thinking: '#f59e0b',
    disconnected: '#64748b',
  };
  const glowColor = glowColors[ralph.state] || '#64748b';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = ralph.state === 'disconnected' ? 5 : 10;

  // Body
  ctx.fillStyle = ralph.state === 'disconnected' ? '#64748b' : '#06b6d4';
  ctx.fillRect(screenX - size / 2, screenY - size + bob, size, size * 1.4);
  ctx.shadowBlur = 0;

  // Head
  ctx.fillStyle = '#fcd5ce';
  ctx.beginPath();
  ctx.arc(screenX, screenY - size * 1.4 + bob, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Hat
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(screenX - size * 0.4, screenY - size * 1.9 + bob, size * 0.8, size * 0.3);

  // Antenna
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenX, screenY - size * 1.9 + bob);
  ctx.lineTo(screenX, screenY - size * 2.3 + bob);
  ctx.stroke();

  // Antenna light
  const lightColor = ralph.state === 'disconnected' ? '#ef4444' :
    ralph.state === 'building' ? '#22c55e' :
    ralph.state === 'thinking' ? '#f59e0b' : '#3b82f6';
  ctx.fillStyle = lightColor;
  ctx.shadowColor = lightColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(screenX, screenY - size * 2.3 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Eyes
  ctx.fillStyle = '#1e293b';
  const eyeOffset = ralph.state === 'building' ? Math.sin(frame * 0.3) * 2 : 0;
  const blinkPhase = frame % 180;

  if (blinkPhase < 5) {
    ctx.fillRect(screenX - 5 * scale, screenY - size * 1.5 + bob, 10 * scale, 1 * scale);
  } else {
    ctx.fillRect(screenX - 4 * scale + eyeOffset, screenY - size * 1.5 + bob, 3 * scale, 3 * scale);
    ctx.fillRect(screenX + 2 * scale + eyeOffset, screenY - size * 1.5 + bob, 3 * scale, 3 * scale);
  }

  // Tool when building
  if (ralph.state === 'building') {
    const hammerAngle = Math.sin(frame * 0.3) * 0.5;
    ctx.save();
    ctx.translate(screenX + size, screenY - size * 0.5 + bob);
    ctx.rotate(hammerAngle);
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(0, 0, 4 * scale, 15 * scale);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-3 * scale, -5 * scale, 10 * scale, 8 * scale);
    ctx.restore();

    if (frame % 10 < 3) {
      ctx.fillStyle = '#fbbf24';
      for (let i = 0; i < 3; i++) {
        const sx = screenX + size + Math.random() * 10;
        const sy = screenY - size * 0.3 + bob + Math.random() * 10;
        ctx.fillRect(sx, sy, 2, 2);
      }
    }
  }

  // Thinking bubbles
  if (ralph.state === 'thinking') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const bubblePhase = (frame * 0.05) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const bx = screenX + 15 + i * 8;
      const by = screenY - size * 2 - i * 10 + Math.sin(bubblePhase + i) * 3 + bob;
      ctx.beginPath();
      ctx.arc(bx, by, 3 + i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Speech bubble
  if (ralph.speechTimer > 0 && ralph.speechBubble) {
    const bubbleWidth = Math.min(ralph.speechBubble.length * 7 + 20, 200);
    const bubbleX = screenX - bubbleWidth / 2;
    const bubbleY = screenY - size * 3.5 + bob;

    const alpha = Math.min(1, ralph.speechTimer / 60);

    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, 24, 8);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(screenX - 5, bubbleY + 24);
    ctx.lineTo(screenX, bubbleY + 32);
    ctx.lineTo(screenX + 5, bubbleY + 24);
    ctx.fill();

    ctx.fillStyle = `rgba(30, 41, 59, ${alpha})`;
    ctx.font = '11px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ralph.speechBubble.substring(0, 25), screenX, bubbleY + 16);
  }
}

function drawTaskAgent(
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

  const bob = agent.state === 'walking' ? Math.sin(frame * 0.15 + agent.x) * 2 : 0;
  const size = 8 * scale;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 10 * scale, 6 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (agent.state === 'celebrating') {
    const jumpHeight = Math.abs(Math.sin(frame * 0.2)) * 15;

    ctx.fillStyle = agent.color;
    ctx.shadowColor = agent.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(screenX - size / 2, screenY - size - jumpHeight, size, size * 1.2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fcd5ce';
    ctx.fillRect(screenX - size / 3, screenY - size * 1.4 - jumpHeight, size * 0.66, size * 0.5);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(screenX - 2 * scale, screenY - size * 1.2 - jumpHeight, 2 * scale, 0, Math.PI, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(screenX + 2 * scale, screenY - size * 1.2 - jumpHeight, 2 * scale, 0, Math.PI, true);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 5; i++) {
      const starX = screenX + Math.cos(frame * 0.1 + i * 1.2) * 25;
      const starY = screenY - size - jumpHeight + Math.sin(frame * 0.1 + i * 1.2) * 15 - 10;
      ctx.font = '10px Arial';
      ctx.fillText(['★', '✦', '•'][i % 3], starX, starY);
    }
  } else {
    ctx.fillStyle = agent.color;
    ctx.fillRect(screenX - size / 2, screenY - size + bob, size, size * 1.2);

    ctx.fillStyle = '#fcd5ce';
    ctx.fillRect(screenX - size / 3, screenY - size * 1.4 + bob, size * 0.66, size * 0.5);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(screenX - 2 * scale, screenY - size * 1.2 + bob, 2 * scale, 2 * scale);
    ctx.fillRect(screenX + 1 * scale, screenY - size * 1.2 + bob, 2 * scale, 2 * scale);
  }
}

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

    if (p.type === 'coin') {
      ctx.fillStyle = '#fbbf24';
      ctx.font = `${16 * p.life}px Arial`;
      ctx.fillText('🪙', screenX - 8, screenY);
    } else if (p.type === 'star') {
      ctx.fillStyle = p.color;
      ctx.font = `${14 * p.life}px Arial`;
      ctx.fillText('✨', screenX - 7, screenY);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 4 * scale * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WorldPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'pueblo' | 'country'>('country');
  const [stats, setStats] = useState({ tasks: 0, ideas: 0, reminders: 0, transactions: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [energy, setEnergy] = useState<EnergySystem>({ current: 45, max: 50, nextReset: '' });
  const [coins, setCoins] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'local' | 'supabase' | 'fallback'>('fallback');
  const [puebloName, setPuebloName] = useState<string>('Aitzol');
  const [pueblos, setPueblos] = useState<Pueblo[]>(PUEBLOS_CONFIG);
  const [caravans, setCaravans] = useState<Caravan[]>(CARAVANS_CONFIG);

  const frameRef = useRef(0);
  const agentsRef = useRef<TaskAgent[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ralphRef = useRef<RalphState>({
    x: 75,
    y: 75,
    targetX: 75,
    targetY: 75,
    state: 'idle',
    currentTask: '',
    speechBubble: '',
    speechTimer: 0,
  });

  // Buildings for the active pueblo
  const buildings: Building[] = [
    {
      id: 'hq', name: 'HQ', type: 'hq', route: '/',
      x: 0, y: 0, width: 90, height: 90, roofHeight: 70,
      color: '#4f46e5', accentColor: '#818cf8', icon: '🏛️',
    },
    {
      id: 'workshop', name: 'TALLER', type: 'workshop', route: '/tasks',
      x: 160, y: 0, width: 75, height: 75, roofHeight: 60,
      color: '#16a34a', accentColor: '#4ade80', icon: '🔧',
      stats: { count: stats.tasks, label: 'pending' },
    },
    {
      id: 'bank', name: 'BANCO', type: 'bank', route: '/finance',
      x: 0, y: 160, width: 80, height: 80, roofHeight: 65,
      color: '#ca8a04', accentColor: '#fbbf24', icon: '🏦',
      stats: { count: stats.transactions, label: 'txs' },
    },
    {
      id: 'library', name: 'BIBLIOTECA', type: 'library', route: '/ideas',
      x: 160, y: 160, width: 75, height: 75, roofHeight: 60,
      color: '#db2777', accentColor: '#f472b6', icon: '📚',
      stats: { count: stats.ideas, label: 'ideas' },
    },
    {
      id: 'tower', name: 'TORRE', type: 'tower', route: '/reminders',
      x: 320, y: 80, width: 50, height: 50, roofHeight: 80,
      color: '#7c3aed', accentColor: '#a78bfa', icon: '🗼',
      stats: { count: stats.reminders, label: 'alerts' },
    },
    {
      id: 'config', name: 'CONFIG', type: 'config', route: '/settings',
      x: -120, y: 80, width: 55, height: 55, roofHeight: 50,
      color: '#475569', accentColor: '#94a3b8', icon: '⚙️',
    },
  ];

  const addLog = useCallback((action: string, type: LogEntry['type']) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ time, action, type }, ...prev.slice(0, 4)]);
  }, []);

  const ralphSay = useCallback((message: string) => {
    ralphRef.current.speechBubble = message;
    ralphRef.current.speechTimer = 180;
  }, []);

  const ralphMoveTo = useCallback((building: Building) => {
    ralphRef.current.targetX = building.x + Math.random() * 30 - 15;
    ralphRef.current.targetY = building.y + Math.random() * 30 - 15;
    ralphRef.current.state = 'walking';
  }, []);

  const fetchRalphStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ralph');
      if (!response.ok) throw new Error('API error');

      const data: RalphAPIResponse = await response.json();

      ralphRef.current.state = data.state;
      ralphRef.current.currentTask = data.currentTask;
      if (data.speechBubble && data.speechBubble !== ralphRef.current.speechBubble) {
        ralphSay(data.speechBubble);
      }

      setEnergy(data.energy);

      setStats({
        tasks: data.stats.tasksPending,
        ideas: data.stats.ideasCount,
        reminders: data.stats.remindersCount,
        transactions: 0,
      });

      setCoins(data.stats.tasksCompleted);

      if (data.recentActivity.length > 0) {
        setLogs(data.recentActivity);
      }

      if (data.source) setDataSource(data.source);
      if (data.pueblo) setPuebloName(data.pueblo);

      // Update active pueblo stats
      setPueblos(prev => prev.map(p => {
        if (p.isActive) {
          return {
            ...p,
            stats: {
              ...p.stats,
              energy: data.energy.current,
              maxEnergy: data.energy.max,
              coins: data.stats.tasksCompleted,
              tasksCompleted: data.stats.tasksCompleted,
              tasksPending: data.stats.tasksPending,
            },
            ralphState: data.state,
          };
        }
        return p;
      }));

      setIsConnected(data.state !== 'disconnected');
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching Ralph status:', error);
      setIsConnected(false);
      setDataSource('fallback');
      ralphRef.current.state = 'disconnected';
      ralphRef.current.speechBubble = 'Sin conexión...';
      ralphRef.current.speechTimer = 300;
    }
  }, [ralphSay]);

  useEffect(() => {
    fetchRalphStatus();
    addLog('Sistema iniciado', 'system');
    ralphSay('¡Bienvenido a OptimAI!');

    const pollInterval = setInterval(() => {
      fetchRalphStatus();
    }, 2000);

    const moveInterval = setInterval(() => {
      if (Math.random() < 0.3 && viewMode === 'pueblo') {
        const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
        ralphMoveTo(randomBuilding);
      }
    }, 5000);

    // Animate caravans
    const caravanInterval = setInterval(() => {
      setCaravans(prev => prev.map(c => ({
        ...c,
        progress: (c.progress + 0.02) % 1,
      })));
    }, 100);

    return () => {
      clearInterval(pollInterval);
      clearInterval(moveInterval);
      clearInterval(caravanInterval);
    };
  }, [fetchRalphStatus, addLog, ralphSay, ralphMoveTo, buildings, viewMode]);

  useEffect(() => {
    async function loadTasks() {
      try {
        const [taskStats, taskList] = await Promise.all([
          api.getTaskStats(),
          api.getTasks(10),
        ]);

        setTasks(taskList.filter(t => t.status === 'in_progress' || t.status === 'pending').slice(0, 6));

        if (!isConnected) {
          setStats(prev => ({ ...prev, tasks: taskStats.pending }));
          setCoins(taskStats.completed);
        }
      } catch (e) {
        console.error('Error loading tasks:', e);
      }
    }

    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [isConnected]);

  useEffect(() => {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    agentsRef.current = tasks.map((task, i) => {
      const targetBuilding = buildings[1 + Math.floor(Math.random() * 4)];
      return {
        id: task.id,
        title: task.title,
        x: 75 + Math.random() * 50 - 25,
        y: 75 + Math.random() * 50 - 25,
        targetX: targetBuilding.x + Math.random() * 40 - 20,
        targetY: targetBuilding.y + Math.random() * 40 - 20,
        speed: 0.3 + Math.random() * 0.3,
        color: colors[i % colors.length],
        building: targetBuilding.id,
        state: 'walking' as const,
        celebrateTimer: 0,
      };
    });
  }, [tasks, buildings]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    function resize() {
      if (!canvas) return;
      const container = canvas.parentElement;
      canvas.width = container?.clientWidth || window.innerWidth;
      canvas.height = container?.clientHeight || window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    function animate() {
      if (!ctx || !canvas) return;

      frameRef.current++;
      const frame = frameRef.current;

      // Scale and offset based on view mode
      const baseScale = viewMode === 'country' ? 0.4 : 1;
      const scale = Math.min(canvas.width / 800, canvas.height / 600) * baseScale;

      const offsetX = canvas.width / 2 - (viewMode === 'country' ? 100 : 50) * scale;
      const offsetY = canvas.height / 2 - (viewMode === 'country' ? 0 : 80) * scale;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0c1222');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stars
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.5 + frame * 0.01) % canvas.width;
        const sy = (i * 97.3) % canvas.height;
        const twinkle = Math.sin(frame * 0.05 + i) > 0.3 ? 1.5 : 1;
        const alpha = 0.3 + Math.sin(frame * 0.02 + i * 0.5) * 0.2;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(sx, sy, twinkle, twinkle);
      }

      // Ground
      drawGround(ctx, offsetX, offsetY, scale, frame);

      if (viewMode === 'country') {
        // COUNTRY VIEW: Show all pueblos with mini buildings and caravans

        // Draw caravans first (behind buildings)
        for (const caravan of caravans) {
          drawCaravan(ctx, caravan, pueblos, offsetX, offsetY, scale, frame);
        }

        // Draw each pueblo's buildings (simplified)
        for (const pueblo of pueblos) {
          // Only draw HQ for each pueblo in country view
          const hqBuilding: Building = {
            id: `${pueblo.id}-hq`,
            name: pueblo.name.toUpperCase(),
            type: 'hq',
            route: '/',
            x: 0,
            y: 0,
            width: 70,
            height: 70,
            roofHeight: 55,
            color: pueblo.color,
            accentColor: pueblo.accentColor,
            icon: pueblo.emoji,
          };

          drawBuilding(ctx, hqBuilding, offsetX, offsetY, scale, false, frame, pueblo.position);
          drawMiniRalph(ctx, pueblo, offsetX, offsetY, scale, frame);
          drawPuebloLabel(ctx, pueblo, offsetX, offsetY, scale, frame);
        }

        // Draw country title
        ctx.font = `bold ${20}px "SF Mono", monospace`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('OPTIMAI COUNTRY', canvas.width / 2, 50);
        ctx.font = `${12}px "SF Mono", monospace`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('3 pueblos conectados', canvas.width / 2, 70);

      } else {
        // PUEBLO VIEW: Show detailed view of active pueblo
        const sortedBuildings = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

        for (const building of sortedBuildings) {
          drawBuilding(ctx, building, offsetX, offsetY, scale, hoveredBuilding === building.id, frame);
        }

        // Update and draw Ralph
        const ralph = ralphRef.current;
        const rdx = ralph.targetX - ralph.x;
        const rdy = ralph.targetY - ralph.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);

        if (rdist > 2) {
          ralph.x += (rdx / rdist) * 0.8;
          ralph.y += (rdy / rdist) * 0.8;
          if (ralph.state !== 'walking') ralph.state = 'walking';
        } else {
          if (ralph.state === 'walking') {
            ralph.state = Math.random() < 0.3 ? 'building' : 'idle';
          }
          if (frame % 300 === 0 && Math.random() < 0.3) {
            const randomBuilding = buildings[Math.floor(Math.random() * buildings.length)];
            ralph.targetX = randomBuilding.x + Math.random() * 40 - 20;
            ralph.targetY = randomBuilding.y + Math.random() * 40 - 20;
          }
        }

        if (ralph.speechTimer > 0) {
          ralph.speechTimer--;
        }

        drawRalph(ctx, ralph, offsetX, offsetY, scale, frame);

        // Task agents
        for (const agent of agentsRef.current) {
          if (agent.state === 'celebrating') {
            agent.celebrateTimer--;
            if (agent.celebrateTimer <= 0) {
              agent.state = 'walking';
              const targetBuilding = buildings.find(b => b.id === agent.building);
              if (targetBuilding) {
                agent.targetX = targetBuilding.x + Math.random() * 40 - 20;
                agent.targetY = targetBuilding.y + Math.random() * 40 - 20;
              }
            }
          } else {
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 1) {
              agent.x += (dx / dist) * agent.speed;
              agent.y += (dy / dist) * agent.speed;
              agent.state = 'walking';
            } else {
              agent.state = 'working';
              if (frame % 500 === 0) {
                const targetBuilding = buildings.find(b => b.id === agent.building);
                if (targetBuilding) {
                  agent.targetX = targetBuilding.x + Math.random() * 50 - 25;
                  agent.targetY = targetBuilding.y + Math.random() * 50 - 25;
                }
              }
            }
          }

          drawTaskAgent(ctx, agent, offsetX, offsetY, scale, frame);
        }
      }

      // Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.type !== 'coin') p.vy += 0.05;
        p.life -= 0.015;
        return p.life > 0;
      });
      drawParticles(ctx, particlesRef.current, offsetX, offsetY, scale);

      animationId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [hoveredBuilding, buildings, pueblos, caravans, viewMode]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewMode === 'country') return; // No hover in country view

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scale = Math.min(canvas.width / 800, canvas.height / 600);
    const offsetX = canvas.width / 2 - 50 * scale;
    const offsetY = canvas.height / 2 - 80 * scale;

    let found: string | null = null;
    for (const building of buildings) {
      const iso = toIso(building.x, building.y);
      const screenX = iso.x * scale + offsetX;
      const screenY = iso.y * scale + offsetY;
      const w = building.width * scale * 0.866;
      const h = building.height * scale * 0.5;

      if (
        mouseX >= screenX - w &&
        mouseX <= screenX + w &&
        mouseY >= screenY - 30 * scale &&
        mouseY <= screenY + h * 2 + building.roofHeight * scale + 30 * scale
      ) {
        found = building.id;
        break;
      }
    }
    setHoveredBuilding(found);
  }, [buildings, viewMode]);

  const handleClick = useCallback(() => {
    if (viewMode === 'country') {
      // In country view, click to zoom into pueblo
      setViewMode('pueblo');
      return;
    }

    if (hoveredBuilding) {
      const building = buildings.find(b => b.id === hoveredBuilding);
      if (building) {
        for (let i = 0; i < 15; i++) {
          particlesRef.current.push({
            x: building.x,
            y: building.y,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 2 - 1,
            life: 1,
            color: building.accentColor,
            type: 'star',
          });
        }

        setEnergy(prev => ({ ...prev, current: Math.max(0, prev.current - 1) }));
        addLog(`Visitando ${building.name}`, 'task');

        setTimeout(() => router.push(building.route), 200);
      }
    }
  }, [hoveredBuilding, buildings, router, addLog, viewMode]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return 'ahora';
    if (seconds < 60) return `hace ${seconds}s`;
    return `hace ${Math.floor(seconds / 60)}m`;
  };

  const activePueblo = pueblos.find(p => p.isActive);

  return (
    <div className={`flex ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-slate-900`}>
      {/* Canvas container */}
      <div className={`relative ${isFullscreen ? 'w-full' : 'flex-1'}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: viewMode === 'country' || hoveredBuilding ? 'pointer' : 'default' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* Title overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-2xl font-bold text-white tracking-wider">
            {viewMode === 'country' ? 'OPTIMAI COUNTRY' : `PUEBLO DE ${puebloName.toUpperCase()}`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {viewMode === 'country' ? 'Click para ver tu pueblo' : 'Click en un edificio para navegar'}
          </p>
        </div>

        {/* Connection status */}
        <div className={`absolute top-4 left-1/2 translate-x-20 flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
          isConnected ? (dataSource === 'local' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400') : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? (dataSource === 'local' ? 'bg-cyan-400' : 'bg-green-400') : 'bg-red-400'
          } ${isConnected ? 'animate-pulse' : ''}`} />
          {isConnected ? (dataSource === 'local' ? 'Local' : dataSource === 'supabase' ? 'Nube' : 'Fallback') : 'Sin conexión'}
        </div>

        {/* Back button */}
        {!isFullscreen && (
          <button
            onClick={() => router.push('/')}
            className="absolute top-4 left-4 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors backdrop-blur-sm border border-slate-700"
          >
            ← Dashboard
          </button>
        )}

        {/* View toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'country' ? 'pueblo' : 'country')}
          className="absolute top-16 left-4 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors backdrop-blur-sm border border-slate-700 flex items-center gap-2"
        >
          {viewMode === 'country' ? <Users className="w-4 h-4" /> : <Map className="w-4 h-4" />}
          {viewMode === 'country' ? 'Mi Pueblo' : 'País'}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg transition-colors backdrop-blur-sm border border-slate-700"
        >
          {isFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Tooltip */}
        {hoveredBuilding && viewMode === 'pueblo' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-600 text-white text-sm">
            Click para ir a <strong>{buildings.find(b => b.id === hoveredBuilding)?.name}</strong>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {!isFullscreen && (
        <div className="w-72 bg-slate-800 border-l border-slate-700 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Pueblos Overview (in country view) */}
          {viewMode === 'country' && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="text-white font-semibold text-sm">Pueblos</span>
              </div>
              <div className="space-y-2">
                {pueblos.map(pueblo => (
                  <div
                    key={pueblo.id}
                    className={`p-2 rounded border ${pueblo.isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 bg-slate-800/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{pueblo.emoji}</span>
                      <span className="text-white font-medium text-sm">{pueblo.name}</span>
                      <div className={`ml-auto w-2 h-2 rounded-full ${
                        pueblo.ralphState === 'building' ? 'bg-green-400' :
                        pueblo.ralphState === 'thinking' ? 'bg-yellow-400' :
                        pueblo.ralphState === 'disconnected' ? 'bg-red-400' :
                        'bg-blue-400'
                      }`} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="text-yellow-400">{pueblo.stats.coins}</span>
                      <span className="text-green-400">{pueblo.stats.tasksPending} tareas</span>
                      <span className="text-orange-400">{pueblo.stats.streak} streak</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Country Level (in country view) */}
          {viewMode === 'country' && (
            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-lg p-3 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Nivel del País</span>
              </div>
              {(() => {
                const totalCoins = pueblos.reduce((sum, p) => sum + p.stats.coins, 0);
                const totalTasks = pueblos.reduce((sum, p) => sum + p.stats.tasksCompleted, 0);
                const totalStreak = pueblos.reduce((sum, p) => sum + p.stats.streak, 0);
                const countryLevel = Math.floor(totalCoins / 100) + 1;
                const xpToNext = 100 - (totalCoins % 100);
                const progressPct = ((totalCoins % 100) / 100) * 100;

                const levelTitles = [
                  'Aldea', 'Villa', 'Pueblo', 'Ciudad', 'Metrópolis',
                  'Capital', 'Imperio', 'Utopía', 'Legendario', 'Mítico'
                ];
                const levelTitle = levelTitles[Math.min(countryLevel - 1, levelTitles.length - 1)];

                return (
                  <>
                    <div className="text-center mb-3">
                      <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                        Lv.{countryLevel}
                      </div>
                      <div className="text-purple-300 text-sm">{levelTitle}</div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>XP hasta Lv.{countryLevel + 1}</span>
                        <span>{xpToNext} coins</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-yellow-400 font-bold">{totalCoins}</div>
                        <div className="text-slate-500">Coins</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-green-400 font-bold">{totalTasks}</div>
                        <div className="text-slate-500">Tareas</div>
                      </div>
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-orange-400 font-bold">{totalStreak}</div>
                        <div className="text-slate-500">Streak</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
                      <TrendingUp className="w-3 h-3" />
                      <span>+{pueblos.filter(p => p.ralphState === 'building').length * 2} XP/min activo</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Shared Tasks (Caravans) */}
          {viewMode === 'country' && caravans.length > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Tareas Compartidas</span>
              </div>
              <div className="space-y-2">
                {caravans.map(caravan => {
                  const from = pueblos.find(p => p.id === caravan.fromPueblo);
                  const to = pueblos.find(p => p.id === caravan.toPueblo);
                  return (
                    <div key={caravan.id} className="p-2 rounded bg-slate-800/50 border border-slate-600">
                      <div className="flex items-center gap-1 text-xs">
                        <span>{from?.emoji}</span>
                        <span className="text-slate-400">→</span>
                        <span>{to?.emoji}</span>
                        <span className="text-white ml-1 truncate">{caravan.taskTitle}</span>
                      </div>
                      <div className="mt-1 w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${caravan.progress * 100}%`, backgroundColor: caravan.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Energy */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-semibold text-sm">Energía</span>
              <span className="ml-auto text-yellow-400 font-mono text-sm">{energy.current}/{energy.max}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-yellow-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(energy.current / energy.max) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">API calls disponibles</p>
          </div>

          {/* Coins */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold text-sm">Monedas</span>
              <span className="ml-auto text-amber-400 font-mono text-lg">{coins}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Tareas completadas</p>
          </div>

          {/* Stats */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold text-sm">Estado del Mundo</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Tareas activas</span>
                <span className="text-green-400 font-mono">{stats.tasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ideas pendientes</span>
                <span className="text-pink-400 font-mono">{stats.ideas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recordatorios</span>
                <span className="text-violet-400 font-mono">{stats.reminders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Agentes activos</span>
                <span className="text-cyan-400 font-mono">{agentsRef.current.length}</span>
              </div>
            </div>
          </div>

          {/* Ralph Activity Log */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold">R</div>
              <span className="text-white font-semibold text-sm">Ralph Monitor</span>
              <RefreshCw className={`w-3 h-3 ml-auto text-slate-500 ${isConnected ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }} />
            </div>

            {/* Ralph current state */}
            <div className="mb-3 p-2 bg-slate-800/50 rounded border border-slate-600">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  ralphRef.current.state === 'building' ? 'bg-green-400' :
                  ralphRef.current.state === 'thinking' ? 'bg-yellow-400' :
                  ralphRef.current.state === 'walking' ? 'bg-blue-400' :
                  ralphRef.current.state === 'disconnected' ? 'bg-red-400' :
                  'bg-slate-400'
                }`} />
                <span className={`capitalize ${ralphRef.current.state === 'disconnected' ? 'text-red-400' : 'text-slate-300'}`}>
                  {ralphRef.current.state === 'disconnected' ? 'Desconectado' : ralphRef.current.state}
                </span>
              </div>
              {ralphRef.current.currentTask && (
                <p className="text-xs text-slate-400 mt-1 truncate">{ralphRef.current.currentTask}</p>
              )}
            </div>

            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-xs">Sin actividad reciente</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-slate-500 font-mono shrink-0">{log.time}</span>
                    <span className={`${
                      log.type === 'coin' ? 'text-amber-400' :
                      log.type === 'energy' ? 'text-yellow-400' :
                      log.type === 'system' ? 'text-cyan-400' :
                      'text-slate-300'
                    } truncate`}>
                      {log.action}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-700 text-xs text-slate-500">
              Actualizado {formatTimeAgo(lastUpdate)}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
            <h3 className="text-white font-semibold text-xs mb-2">Edificios</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {buildings.map(b => (
                <div key={b.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded" style={{ backgroundColor: b.color }}></div>
                  <span className="text-slate-400">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
