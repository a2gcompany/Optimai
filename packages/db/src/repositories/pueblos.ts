import { getSupabaseClient } from '../client';

// Use lazy initialization to avoid build errors
function getClient() {
  return getSupabaseClient();
}

// ============================================================================
// TYPES
// ============================================================================

export interface Pueblo {
  id: string;
  nombre: string;
  owner_id?: string;
  owner_name: string;
  avatar_emoji: string;
  color_primary: string;
  color_secondary: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PuebloStats {
  id: string;
  pueblo_id: string;
  energy_current: number;
  energy_max: number;
  coins_total: number;
  coins_today: number;
  tasks_completed_total: number;
  tasks_completed_today: number;
  tasks_pending: number;
  ralph_state: 'idle' | 'walking' | 'building' | 'thinking' | 'disconnected';
  ralph_last_seen: string;
  streak_days: number;
  updated_at: string;
}

export interface TareaCompartida {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  prioridad: number;
  pueblo_creador_id: string;
  pueblos_involucrados: string[];
  pueblos_completados: string[];
  fecha_limite?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Caravana {
  id: string;
  tarea_id?: string;
  pueblo_origen_id: string;
  pueblo_destino_id: string;
  tipo: 'task' | 'resource' | 'message';
  estado: 'en_camino' | 'llegada' | 'completada';
  progreso: number;
  mensaje?: string;
  created_at: string;
  arrived_at?: string;
}

export interface PuebloMessage {
  id: string;
  from_pueblo_id: string;
  to_pueblo_id: string;
  mensaje: string;
  tipo: 'chat' | 'notification' | 'system';
  leido: boolean;
  created_at: string;
}

// ============================================================================
// PUEBLOS REPOSITORY
// ============================================================================

export const pueblosRepository = {
  // Get all active pueblos
  async getAll(): Promise<Pueblo[]> {
    const { data, error } = await getClient()
      .from('pueblos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pueblos:', error);
      return [];
    }
    return data || [];
  },

  // Get pueblo by ID
  async getById(id: string): Promise<Pueblo | null> {
    const { data, error } = await getClient()
      .from('pueblos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching pueblo:', error);
      return null;
    }
    return data;
  },

  // Get pueblo by owner name
  async getByOwnerName(ownerName: string): Promise<Pueblo | null> {
    const { data, error } = await getClient()
      .from('pueblos')
      .select('*')
      .eq('owner_name', ownerName)
      .single();

    if (error) {
      console.error('Error fetching pueblo by owner:', error);
      return null;
    }
    return data;
  },

  // Create new pueblo
  async create(pueblo: Omit<Pueblo, 'id' | 'created_at' | 'updated_at'>): Promise<Pueblo | null> {
    const { data, error } = await getClient()
      .from('pueblos')
      .insert(pueblo)
      .select()
      .single();

    if (error) {
      console.error('Error creating pueblo:', error);
      return null;
    }
    return data;
  },

  // Update pueblo
  async update(id: string, updates: Partial<Pueblo>): Promise<Pueblo | null> {
    const { data, error } = await getClient()
      .from('pueblos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pueblo:', error);
      return null;
    }
    return data;
  },
};

// ============================================================================
// PUEBLO STATS REPOSITORY
// ============================================================================

export const puebloStatsRepository = {
  // Get stats for all pueblos
  async getAll(): Promise<PuebloStats[]> {
    const { data, error } = await getClient()
      .from('pueblo_stats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching pueblo stats:', error);
      return [];
    }
    return data || [];
  },

  // Get stats for specific pueblo
  async getByPuebloId(puebloId: string): Promise<PuebloStats | null> {
    const { data, error } = await getClient()
      .from('pueblo_stats')
      .select('*')
      .eq('pueblo_id', puebloId)
      .single();

    if (error) {
      console.error('Error fetching pueblo stats:', error);
      return null;
    }
    return data;
  },

  // Update stats for pueblo
  async update(puebloId: string, updates: Partial<PuebloStats>): Promise<PuebloStats | null> {
    const { data, error } = await getClient()
      .from('pueblo_stats')
      .update(updates)
      .eq('pueblo_id', puebloId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pueblo stats:', error);
      return null;
    }
    return data;
  },

  // Increment coins
  async addCoins(puebloId: string, amount: number): Promise<void> {
    const stats = await this.getByPuebloId(puebloId);
    if (stats) {
      await this.update(puebloId, {
        coins_total: stats.coins_total + amount,
        coins_today: stats.coins_today + amount,
      });
    }
  },

  // Complete task
  async completeTask(puebloId: string): Promise<void> {
    const stats = await this.getByPuebloId(puebloId);
    if (stats) {
      await this.update(puebloId, {
        tasks_completed_total: stats.tasks_completed_total + 1,
        tasks_completed_today: stats.tasks_completed_today + 1,
        tasks_pending: Math.max(0, stats.tasks_pending - 1),
        coins_total: stats.coins_total + 1,
        coins_today: stats.coins_today + 1,
      });
    }
  },

  // Update Ralph state
  async updateRalphState(puebloId: string, state: PuebloStats['ralph_state']): Promise<void> {
    await this.update(puebloId, {
      ralph_state: state,
      ralph_last_seen: new Date().toISOString(),
    });
  },

  // Reset daily stats (call at midnight)
  async resetDailyStats(): Promise<void> {
    const { error } = await getClient()
      .from('pueblo_stats')
      .update({
        coins_today: 0,
        tasks_completed_today: 0,
        energy_current: 50, // Reset energy
      })
      .neq('id', '');

    if (error) {
      console.error('Error resetting daily stats:', error);
    }
  },
};

// ============================================================================
// TAREAS COMPARTIDAS REPOSITORY
// ============================================================================

export const tareasCompartidasRepository = {
  // Get all shared tasks
  async getAll(): Promise<TareaCompartida[]> {
    const { data, error } = await getClient()
      .from('tareas_compartidas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tareas compartidas:', error);
      return [];
    }
    return data || [];
  },

  // Get tasks for specific pueblo
  async getByPueblo(puebloId: string): Promise<TareaCompartida[]> {
    const { data, error } = await getClient()
      .from('tareas_compartidas')
      .select('*')
      .contains('pueblos_involucrados', [puebloId])
      .order('prioridad', { ascending: false });

    if (error) {
      console.error('Error fetching tareas for pueblo:', error);
      return [];
    }
    return data || [];
  },

  // Get pending tasks
  async getPending(): Promise<TareaCompartida[]> {
    const { data, error } = await getClient()
      .from('tareas_compartidas')
      .select('*')
      .in('estado', ['pending', 'in_progress'])
      .order('prioridad', { ascending: false });

    if (error) {
      console.error('Error fetching pending tareas:', error);
      return [];
    }
    return data || [];
  },

  // Create shared task
  async create(tarea: Omit<TareaCompartida, 'id' | 'created_at' | 'updated_at'>): Promise<TareaCompartida | null> {
    const { data, error } = await getClient()
      .from('tareas_compartidas')
      .insert(tarea)
      .select()
      .single();

    if (error) {
      console.error('Error creating tarea compartida:', error);
      return null;
    }
    return data;
  },

  // Mark pueblo as completed for task
  async markPuebloCompleted(tareaId: string, puebloId: string): Promise<void> {
    const tarea = await this.getById(tareaId);
    if (tarea && !tarea.pueblos_completados.includes(puebloId)) {
      const newCompletados = [...tarea.pueblos_completados, puebloId];
      const estado = newCompletados.length === tarea.pueblos_involucrados.length ? 'completed' : 'in_progress';

      await getClient()
        .from('tareas_compartidas')
        .update({
          pueblos_completados: newCompletados,
          estado,
        })
        .eq('id', tareaId);
    }
  },

  // Get task by ID
  async getById(id: string): Promise<TareaCompartida | null> {
    const { data, error } = await getClient()
      .from('tareas_compartidas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tarea:', error);
      return null;
    }
    return data;
  },
};

// ============================================================================
// CARAVANAS REPOSITORY
// ============================================================================

export const caravanasRepository = {
  // Get active caravans
  async getActive(): Promise<Caravana[]> {
    const { data, error } = await getClient()
      .from('caravanas')
      .select('*')
      .in('estado', ['en_camino', 'llegada'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching caravanas:', error);
      return [];
    }
    return data || [];
  },

  // Create caravan
  async create(caravana: Omit<Caravana, 'id' | 'created_at'>): Promise<Caravana | null> {
    const { data, error } = await getClient()
      .from('caravanas')
      .insert(caravana)
      .select()
      .single();

    if (error) {
      console.error('Error creating caravana:', error);
      return null;
    }
    return data;
  },

  // Update caravan progress
  async updateProgress(id: string, progreso: number): Promise<void> {
    const estado = progreso >= 100 ? 'llegada' : 'en_camino';
    const updates: Partial<Caravana> = { progreso, estado };

    if (progreso >= 100) {
      updates.arrived_at = new Date().toISOString();
    }

    await getClient()
      .from('caravanas')
      .update(updates)
      .eq('id', id);
  },

  // Mark caravan as completed
  async complete(id: string): Promise<void> {
    await getClient()
      .from('caravanas')
      .update({ estado: 'completada' })
      .eq('id', id);
  },
};

// ============================================================================
// PUEBLO MESSAGES REPOSITORY
// ============================================================================

export const puebloMessagesRepository = {
  // Get messages for pueblo
  async getForPueblo(puebloId: string, limit = 50): Promise<PuebloMessage[]> {
    const { data, error } = await getClient()
      .from('pueblo_messages')
      .select('*')
      .eq('to_pueblo_id', puebloId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data || [];
  },

  // Get unread count
  async getUnreadCount(puebloId: string): Promise<number> {
    const { count, error } = await getClient()
      .from('pueblo_messages')
      .select('*', { count: 'exact', head: true })
      .eq('to_pueblo_id', puebloId)
      .eq('leido', false);

    if (error) {
      console.error('Error counting unread:', error);
      return 0;
    }
    return count || 0;
  },

  // Send message
  async send(message: Omit<PuebloMessage, 'id' | 'created_at' | 'leido'>): Promise<PuebloMessage | null> {
    const { data, error } = await getClient()
      .from('pueblo_messages')
      .insert({ ...message, leido: false })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }
    return data;
  },

  // Mark as read
  async markAsRead(id: string): Promise<void> {
    await getClient()
      .from('pueblo_messages')
      .update({ leido: true })
      .eq('id', id);
  },

  // Mark all as read
  async markAllAsRead(puebloId: string): Promise<void> {
    await getClient()
      .from('pueblo_messages')
      .update({ leido: true })
      .eq('to_pueblo_id', puebloId)
      .eq('leido', false);
  },
};
