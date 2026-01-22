# Prompt para Ralph - Rebuild World View (Optimai)

**Repo:** `a2gcompany/Optimai`
**Objetivo:** Reconstruir la vista "World" como dashboard 2D retro (estilo Game Boy/NES)

---

## REGLAS ABSOLUTAS

1. **NO isométrico** - Eliminar todo código iso del World
2. **NO datos falsos** - Prohibido: `Math.random()`, timestamps dummy, contadores hardcodeados
3. **NO animaciones fake** - Ralph se mueve SOLO cuando hay cambio real en DB
4. **TODO desde Supabase** - Server components o route handlers (nunca exponer keys)
5. **Robusto** - Manejar loading, empty states, offline

---

## ARQUITECTURA DE DATOS

### Tablas Supabase (crear en `supabase/migrations/002_core_tables.sql`)

```sql
-- 1. Estado de Ralph
CREATE TABLE ralph_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'idle', 'stopped')),
  current_building TEXT NOT NULL CHECK (current_building IN ('hq', 'taller', 'banco', 'biblioteca', 'torre')),
  last_action TEXT,
  energy INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ralph_status_user ON ralph_status(user_id);
CREATE INDEX idx_ralph_status_updated ON ralph_status(updated_at);

-- 2. Tareas
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  building TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_completed ON tasks(user_id, completed_at);

-- 3. Finanzas
CREATE TABLE finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_finances_user_date ON finances(user_id, created_at DESC);

-- 4. Ideas
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ideas_user ON ideas(user_id, created_at);

-- 5. Recordatorios
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reminders_user_status ON reminders(user_id, status);
```

---

## LAYOUT DEL WORLD

### Grid 2D (5 edificios + Ralph)

```
        [Biblioteca]
            (top)
              |
  [Taller] - [HQ] - [Banco]
   (left)  (center)  (right)
              |
          [Torre]
          (bottom)
```

### Edificios y sus datos

| Edificio | Posición | Dato real | Ruta destino |
|----------|----------|-----------|--------------|
| HQ | Centro | Dashboard stats | `/dashboard` |
| Taller | Izquierda | `COUNT(tasks WHERE status='pending')` | `/tasks` |
| Banco | Derecha | `finances.total` (último registro) | `/finance` |
| Biblioteca | Arriba | `COUNT(ideas)` | `/ideas` |
| Torre | Abajo | `COUNT(reminders WHERE status='active')` | `/reminders` |

### Panel derecho (stats reales)

- **Estado Ralph:** `ralph_status.status` (running/idle/stopped)
- **Última acción:** `ralph_status.last_action`
- **Tareas pendientes:** COUNT real
- **Última actividad:** `ralph_status.updated_at`
- **Energía:** `ralph_status.energy`
- **Coins:** `COUNT(tasks WHERE completed_at >= TODAY)`

### Colores por estado REAL

- Verde = `status='running'`
- Amarillo = `status='idle'`
- Gris = `status='stopped'`

---

## MOVIMIENTO DE RALPH

Ralph NO deambula. Su posición se deriva ÚNICAMENTE de `ralph_status.current_building`.

**Coordenadas por edificio:**
```typescript
const BUILDING_COORDS = {
  hq: { x: 2, y: 2 },        // centro
  taller: { x: 0, y: 2 },    // izquierda
  banco: { x: 4, y: 2 },     // derecha
  biblioteca: { x: 2, y: 0 }, // arriba
  torre: { x: 2, y: 4 }      // abajo
};
```

**Animación:** Solo cuando `current_building` cambia entre fetches. Si es complejo, teleport es válido.

**Indicadores:**
- `running` → icono gear pequeño
- `stopped` → Zzz + tema gris

---

## ARCHIVOS A MODIFICAR

### 1. REESCRIBIR COMPLETAMENTE
```
apps/web/src/app/world/page.tsx
```
- Eliminar imports isométricos
- Server component con fetch a Supabase
- Grid CSS 2D con estética pixel/retro
- Renderizar edificios con contadores reales
- Renderizar Ralph en coordenadas de `current_building`
- Panel derecho con stats reales
- Loading/empty states robustos

### 2. VERIFICAR/ADAPTAR
```
apps/web/src/app/api/ralph/route.ts
```
- Debe leer de Supabase (no datos mock)

### 3. CREAR SI NO EXISTE
```
apps/web/src/app/api/world/summary/route.ts
```
```typescript
// GET /api/world/summary
// Returns: { ralph_status, counts, latest_finance, last_log }
```

---

## PASOS DE IMPLEMENTACIÓN

1. **Inspeccionar** código existente de World, identificar y eliminar código isométrico
2. **Crear migración** `002_core_tables.sql` con las tablas definidas
3. **Implementar data layer** para World summary (queries reales)
4. **Reconstruir** `page.tsx`:
   - Layout: grid izquierda + panel derecho
   - Edificios clicables con contadores
   - Ralph sprite posicionado por `current_building`
   - Estados visuales por `status`
5. **Manejar edge cases**:
   - Sin `ralph_status` → "Ralph no inicializado"
   - Tablas vacías → mostrar ceros (datos reales = 0)
   - Usuario no autenticado → redirect a login
6. **Verificar** typecheck, lint, build
7. **Deploy** a Vercel

---

## DATOS DE PRUEBA (para seed)

```sql
-- Insertar estado inicial de Ralph
INSERT INTO ralph_status (user_id, status, current_building, last_action, energy)
VALUES ('TU_USER_ID', 'idle', 'hq', 'Esperando instrucciones', 50);

-- Insertar algunas tareas
INSERT INTO tasks (user_id, title, building, status) VALUES
('TU_USER_ID', 'Revisar código', 'taller', 'pending'),
('TU_USER_ID', 'Actualizar docs', 'taller', 'pending'),
('TU_USER_ID', 'Deploy v2', 'taller', 'completed');

-- Insertar balance
INSERT INTO finances (user_id, total) VALUES ('TU_USER_ID', 15000.00);

-- Insertar ideas
INSERT INTO ideas (user_id, title) VALUES
('TU_USER_ID', 'Nueva feature X'),
('TU_USER_ID', 'Optimizar queries');

-- Insertar reminders
INSERT INTO reminders (user_id, title, status) VALUES
('TU_USER_ID', 'Llamar a cliente', 'active'),
('TU_USER_ID', 'Revisar facturas', 'active');
```

---

## CRITERIOS DE ÉXITO

- [ ] `/world` muestra grid 2D con 5 edificios y Ralph
- [ ] Posición de Ralph = `ralph_status.current_building` (real)
- [ ] Contadores = queries reales a Supabase
- [ ] Panel derecho = datos reales
- [ ] Sin `Math.random()`, sin datos fake, sin animaciones simuladas
- [ ] Build exitoso en Vercel

---

## OUTPUT ESPERADO

Al finalizar, reportar:
1. Lista de archivos modificados/creados
2. Contenido de la migración SQL
3. Nuevos endpoints API (si los hay)
4. Comandos para verificar localmente
5. Comportamiento esperado en UI
