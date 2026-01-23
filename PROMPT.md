# Prompt para Ralph - Tasks & Reminders Unificado

**Repo:** `a2gcompany/Optimai`
**Objetivo:** Crear herramienta unificada de Tareas + Recordatorios con importación manual

---

## CONCEPTO

Fusionar Tasks y Reminders en una sola herramienta. La lógica corre LOCAL, la web es solo interfaz de visualización.

---

## ARQUITECTURA

```
LOCAL (Node.js CLI / Scripts)
├── Importador de extractos (CSV/JSON)
├── Parser de recordatorios
├── Sincronización con Supabase
└── Lógica de negocio

WEB (Next.js - Solo UI)
├── Visualización de tareas/reminders
├── Filtros y búsqueda
├── Edición inline
└── Sin lógica de negocio pesada
```

---

## MODELO DE DATOS UNIFICADO

```sql
-- Tabla unificada tasks_reminders
CREATE TABLE IF NOT EXISTS tasks_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Contenido
  title TEXT NOT NULL,
  description TEXT,

  -- Tipo y estado
  type TEXT NOT NULL CHECK (type IN ('task', 'reminder')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Fechas
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Recurrencia (para reminders)
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- 'daily', 'weekly', 'monthly', etc.

  -- Origen
  source TEXT DEFAULT 'manual', -- 'manual', 'import', 'telegram'
  source_file TEXT, -- nombre del archivo si fue importado

  -- Tags
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_tasks_reminders_user ON tasks_reminders(user_id);
CREATE INDEX idx_tasks_reminders_status ON tasks_reminders(user_id, status);
CREATE INDEX idx_tasks_reminders_due ON tasks_reminders(user_id, due_date);
CREATE INDEX idx_tasks_reminders_type ON tasks_reminders(user_id, type);
```

---

## COMPONENTES A CREAR

### 1. CLI Local - Importador (`scripts/import-tasks.mjs`)

```javascript
// Uso: node scripts/import-tasks.mjs <archivo.csv>
// Soporta: CSV, JSON, TXT (un item por línea)
// Auto-detecta formato
// Pregunta confirmación antes de importar
// Sincroniza con Supabase
```

**Formatos soportados:**
- CSV: `title,description,due_date,priority,type`
- JSON: `[{title, description, due_date, priority, type}]`
- TXT: Una tarea por línea (se importa como task pending)

### 2. CLI Local - Sync (`scripts/sync-tasks.mjs`)

```javascript
// Sincroniza local <-> Supabase
// Puede correr como cron job
// Maneja conflictos (último gana)
```

### 3. Web UI - Lista Unificada (`/tasks`)

- Vista lista con filtros: tipo, estado, prioridad, fecha
- Tabs: Todas | Tareas | Recordatorios | Completadas
- Edición inline (click para editar)
- Drag & drop para cambiar prioridad
- Bulk actions: completar, eliminar, cambiar prioridad

### 4. Web UI - Vista Calendario (`/tasks/calendar`)

- Calendario mensual con tareas/reminders
- Click en día para ver/crear
- Colores por tipo y prioridad

---

## PASOS DE IMPLEMENTACIÓN

1. **Crear migración SQL** para tabla unificada
2. **Crear script importador** `scripts/import-tasks.mjs`
3. **Crear script sync** `scripts/sync-tasks.mjs`
4. **Actualizar/crear página** `/tasks` con UI unificada
5. **API routes** para CRUD
6. **Probar importación** con archivo de ejemplo
7. **Verificar build** y deploy

---

## GIT WORKFLOW (OBLIGATORIO)

**Haz commit y push después de cada cambio notable:**

1. Después de crear/modificar un archivo importante → commit + push
2. Después de completar un paso de implementación → commit + push
3. Después de arreglar un bug o error → commit + push

```bash
git add <archivos_específicos>
git commit -m "feat|fix: descripción corta"
git push origin main
```

**NO acumules cambios.** Push frecuente = progreso visible.

---

## EJEMPLO DE IMPORTACIÓN

Archivo `mis-tareas.csv`:
```csv
title,description,due_date,priority,type
Llamar a Roger,Confirmar fecha del show,2026-01-25,high,task
Revisar contrato BABEL,Pendiente firma,2026-01-24,urgent,task
Pagar factura Vercel,Mensual,2026-01-30,medium,reminder
Reunión A2G Talents,Semanal con equipo,2026-01-27,medium,reminder
```

Comando:
```bash
node scripts/import-tasks.mjs mis-tareas.csv
```

---

## CRITERIOS DE ÉXITO

- [ ] Tabla `tasks_reminders` creada en Supabase
- [ ] Script importador funciona con CSV/JSON/TXT
- [ ] Script sync funciona bidireccional
- [ ] UI `/tasks` muestra lista unificada con filtros
- [ ] Edición inline funciona
- [ ] Build exitoso en Vercel

---

## NOTAS

- NO tocar el World por ahora
- Priorizar funcionalidad sobre estética
- La lógica pesada va en scripts locales, NO en la web
- Usar las credenciales de Supabase existentes en el proyecto
