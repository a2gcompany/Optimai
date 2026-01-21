-- ============================================================================
-- OPTIMAI PUEBLOS SCHEMA
-- Arquitectura multi-usuario donde cada pueblo es un usuario
-- ============================================================================

-- Tabla de pueblos (cada usuario es un pueblo)
CREATE TABLE IF NOT EXISTS pueblos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  owner_id UUID REFERENCES nucleus_users(id),
  owner_name VARCHAR(100) NOT NULL,
  avatar_emoji VARCHAR(10) DEFAULT '🏘️',
  color_primary VARCHAR(7) DEFAULT '#06b6d4',
  color_secondary VARCHAR(7) DEFAULT '#0891b2',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats públicas de cada pueblo (visible para todos)
CREATE TABLE IF NOT EXISTS pueblo_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pueblo_id UUID REFERENCES pueblos(id) ON DELETE CASCADE,
  energy_current INTEGER DEFAULT 50,
  energy_max INTEGER DEFAULT 50,
  coins_total INTEGER DEFAULT 0,
  coins_today INTEGER DEFAULT 0,
  tasks_completed_total INTEGER DEFAULT 0,
  tasks_completed_today INTEGER DEFAULT 0,
  tasks_pending INTEGER DEFAULT 0,
  ralph_state VARCHAR(20) DEFAULT 'idle',
  ralph_last_seen TIMESTAMPTZ DEFAULT NOW(),
  streak_days INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pueblo_id)
);

-- Tareas compartidas entre pueblos
CREATE TABLE IF NOT EXISTS tareas_compartidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(500) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  prioridad INTEGER DEFAULT 0,
  pueblo_creador_id UUID REFERENCES pueblos(id),
  pueblos_involucrados UUID[] NOT NULL, -- Array de pueblo_ids
  pueblos_completados UUID[] DEFAULT '{}', -- Pueblos que ya completaron su parte
  fecha_limite TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caravanas (representan colaboración activa entre pueblos)
CREATE TABLE IF NOT EXISTS caravanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas_compartidas(id) ON DELETE CASCADE,
  pueblo_origen_id UUID REFERENCES pueblos(id),
  pueblo_destino_id UUID REFERENCES pueblos(id),
  tipo VARCHAR(50) DEFAULT 'task', -- task, resource, message
  estado VARCHAR(20) DEFAULT 'en_camino', -- en_camino, llegada, completada
  progreso INTEGER DEFAULT 0, -- 0-100
  mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  arrived_at TIMESTAMPTZ
);

-- Mensajes entre pueblos
CREATE TABLE IF NOT EXISTS pueblo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_pueblo_id UUID REFERENCES pueblos(id),
  to_pueblo_id UUID REFERENCES pueblos(id),
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'chat', -- chat, notification, system
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pueblo_stats_pueblo_id ON pueblo_stats(pueblo_id);
CREATE INDEX IF NOT EXISTS idx_tareas_compartidas_estado ON tareas_compartidas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_compartidas_pueblos ON tareas_compartidas USING GIN(pueblos_involucrados);
CREATE INDEX IF NOT EXISTS idx_caravanas_estado ON caravanas(estado);
CREATE INDEX IF NOT EXISTS idx_pueblo_messages_to ON pueblo_messages(to_pueblo_id, leido);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
DROP TRIGGER IF EXISTS update_pueblos_updated_at ON pueblos;
CREATE TRIGGER update_pueblos_updated_at BEFORE UPDATE ON pueblos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pueblo_stats_updated_at ON pueblo_stats;
CREATE TRIGGER update_pueblo_stats_updated_at BEFORE UPDATE ON pueblo_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tareas_compartidas_updated_at ON tareas_compartidas;
CREATE TRIGGER update_tareas_compartidas_updated_at BEFORE UPDATE ON tareas_compartidas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATOS INICIALES - Los 3 pueblos fundadores
-- ============================================================================

-- Pueblo de Aitzol (el CEO)
INSERT INTO pueblos (nombre, owner_name, avatar_emoji, color_primary, color_secondary)
VALUES ('Aitzol', 'Aitzol', '🏛️', '#06b6d4', '#0891b2')
ON CONFLICT DO NOTHING;

-- Pueblo de Alvaro
INSERT INTO pueblos (nombre, owner_name, avatar_emoji, color_primary, color_secondary)
VALUES ('Alvaro', 'Alvaro', '⚡', '#f59e0b', '#d97706')
ON CONFLICT DO NOTHING;

-- Pueblo de Sergi
INSERT INTO pueblos (nombre, owner_name, avatar_emoji, color_primary, color_secondary)
VALUES ('Sergi', 'Sergi', '🎯', '#22c55e', '#16a34a')
ON CONFLICT DO NOTHING;

-- Inicializar stats para los pueblos
INSERT INTO pueblo_stats (pueblo_id, energy_current, energy_max, ralph_state)
SELECT id, 50, 50, 'idle' FROM pueblos
ON CONFLICT DO NOTHING;
