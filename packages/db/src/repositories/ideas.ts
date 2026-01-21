/**
 * Ideas repository using kg_entities table with type='idea'
 * Stores ideas as knowledge graph entities for persistence in Supabase
 */

import { getSupabaseClient } from '../index';

export type IdeaStatus = 'idea' | 'evaluating' | 'planned' | 'in_progress' | 'done' | 'rejected';
export type IdeaEffort = 'xs' | 's' | 'm' | 'l' | 'xl';
export type IdeaImpact = 'low' | 'medium' | 'high' | 'critical';

export interface Idea {
  id: string;
  title: string;
  description?: string;
  status: IdeaStatus;
  category?: string;
  effort?: IdeaEffort;
  impact?: IdeaImpact;
  votes: number;
  tags: string[];
  assignee?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface IdeaInsert {
  title: string;
  description?: string;
  status?: IdeaStatus;
  category?: string;
  effort?: IdeaEffort;
  impact?: IdeaImpact;
  votes?: number;
  tags?: string[];
  assignee?: string;
  due_date?: string;
}

export type IdeaUpdate = Partial<IdeaInsert>;

// Use 'project' type since 'idea' is not in the entity_type enum
// Store entity_subtype='idea' in properties to distinguish from regular projects
const ENTITY_TYPE = 'project';
const ENTITY_SUBTYPE = 'optimai_idea';

// Convert kg_entity to Idea
function entityToIdea(entity: any): Idea {
  const props = entity.properties || {};
  return {
    id: entity.id,
    title: entity.display_name || entity.name,
    description: entity.description || props.description,
    status: props.status || 'idea',
    category: props.category,
    effort: props.effort,
    impact: props.impact,
    votes: props.votes || 0,
    tags: entity.aliases || [],
    assignee: props.assignee,
    due_date: props.due_date,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}

// Convert Idea to kg_entity format
function ideaToEntity(idea: IdeaInsert | IdeaUpdate, existing?: Partial<Idea>) {
  return {
    type: ENTITY_TYPE,
    name: (idea.title ?? existing?.title ?? '').toLowerCase().replace(/\s+/g, '-').slice(0, 50),
    display_name: idea.title ?? existing?.title,
    description: idea.description ?? existing?.description,
    aliases: idea.tags ?? existing?.tags ?? [],
    properties: {
      entity_subtype: ENTITY_SUBTYPE,
      status: idea.status ?? existing?.status ?? 'idea',
      category: idea.category ?? existing?.category,
      effort: idea.effort ?? existing?.effort,
      impact: idea.impact ?? existing?.impact,
      votes: idea.votes ?? existing?.votes ?? 0,
      assignee: idea.assignee ?? existing?.assignee,
      due_date: idea.due_date ?? existing?.due_date,
    },
    importance_score: getImportanceScore(idea.impact ?? existing?.impact, idea.votes ?? existing?.votes ?? 0),
    is_active: (idea.status ?? existing?.status) !== 'rejected',
  };
}

function getImportanceScore(impact?: IdeaImpact, votes: number = 0): number {
  const impactScores: Record<string, number> = {
    low: 0.2,
    medium: 0.4,
    high: 0.6,
    critical: 0.8,
  };
  const baseScore = impactScores[impact || 'medium'] || 0.4;
  const voteBonus = Math.min(votes * 0.02, 0.2);
  return Math.min(baseScore + voteBonus, 1.0);
}

// Sample ideas for initial data
const sampleIdeas: IdeaInsert[] = [
  { title: 'Dark mode para dashboard', description: 'Implementar tema oscuro en toda la aplicación', status: 'planned', category: 'UI/UX', effort: 's', impact: 'medium', votes: 5, tags: ['ui', 'accesibilidad'] },
  { title: 'Integración con Stripe', description: 'Conectar con Stripe para ver pagos de artistas', status: 'evaluating', category: 'Backend', effort: 'l', impact: 'high', votes: 8, tags: ['pagos', 'artistas', 'api'] },
  { title: 'App móvil React Native', description: 'Crear app nativa para iOS/Android', status: 'idea', category: 'Mobile', effort: 'xl', impact: 'high', votes: 12, tags: ['mobile', 'react-native'] },
  { title: 'Exportar a Excel', description: 'Añadir botón para exportar transacciones a Excel', status: 'in_progress', category: 'Feature', effort: 's', impact: 'medium', votes: 3, tags: ['export', 'finance'] },
  { title: 'Dashboard de artistas', description: 'Vista específica para cada artista gestionado', status: 'planned', category: 'Feature', effort: 'm', impact: 'high', votes: 7, tags: ['artistas', 'dashboard'] },
  { title: 'Notificaciones push', description: 'Alertas cuando hay nuevos bookings o pagos', status: 'evaluating', category: 'Feature', effort: 'm', impact: 'medium', votes: 4, tags: ['notificaciones', 'telegram'] },
  { title: 'Gráficas de tendencias', description: 'Visualizar ingresos/gastos a lo largo del tiempo', status: 'done', category: 'Analytics', effort: 'm', impact: 'high', votes: 6, tags: ['charts', 'analytics'] },
  { title: 'Multi-currency support', description: 'Manejar EUR, USD, AED con conversión automática', status: 'idea', category: 'Backend', effort: 'l', impact: 'high', votes: 9, tags: ['currency', 'international'] },
];

// In-memory cache as fallback
const ideasCache = new Map<string, Idea>();
let cacheInitialized = false;

function initSampleIdeas(): void {
  if (cacheInitialized) return;
  cacheInitialized = true;

  sampleIdeas.forEach((idea, index) => {
    const id = `idea-${index + 1}`;
    ideasCache.set(id, {
      id,
      title: idea.title,
      description: idea.description,
      status: idea.status || 'idea',
      category: idea.category,
      effort: idea.effort,
      impact: idea.impact,
      votes: idea.votes || 0,
      tags: idea.tags || [],
      assignee: idea.assignee,
      due_date: idea.due_date,
      created_at: new Date(Date.now() - (sampleIdeas.length - index) * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kg_entities')
      .select('*')
      .eq('id', id)
      .eq('type', ENTITY_TYPE)
      .single();

    if (error || !data) {
      initSampleIdeas();
      return ideasCache.get(id) || null;
    }

    // Verify it's an optimai idea
    if (data.properties?.entity_subtype !== ENTITY_SUBTYPE) {
      initSampleIdeas();
      return ideasCache.get(id) || null;
    }

    return entityToIdea(data);
  } catch {
    initSampleIdeas();
    return ideasCache.get(id) || null;
  }
}

export async function getAllIdeas(): Promise<Idea[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kg_entities')
      .select('*')
      .eq('type', ENTITY_TYPE)
      .contains('properties', { entity_subtype: ENTITY_SUBTYPE })
      .order('importance_score', { ascending: false });

    if (error || !data || data.length === 0) {
      initSampleIdeas();
      return Array.from(ideasCache.values());
    }

    return data.map(entityToIdea);
  } catch {
    initSampleIdeas();
    return Array.from(ideasCache.values());
  }
}

export async function getIdeasByStatus(status: IdeaStatus): Promise<Idea[]> {
  const allIdeas = await getAllIdeas();
  return allIdeas.filter(idea => idea.status === status);
}

export async function createIdea(idea: IdeaInsert): Promise<Idea> {
  try {
    const supabase = getSupabaseClient();
    const entityData = ideaToEntity(idea);

    const { data, error } = await supabase
      .from('kg_entities')
      .insert(entityData)
      .select()
      .single();

    if (error) throw error;
    return entityToIdea(data);
  } catch {
    initSampleIdeas();
    const id = `idea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newIdea: Idea = {
      id,
      title: idea.title,
      description: idea.description,
      status: idea.status || 'idea',
      category: idea.category,
      effort: idea.effort,
      impact: idea.impact,
      votes: idea.votes || 0,
      tags: idea.tags || [],
      assignee: idea.assignee,
      due_date: idea.due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    ideasCache.set(id, newIdea);
    return newIdea;
  }
}

export async function updateIdea(id: string, updates: IdeaUpdate): Promise<Idea> {
  try {
    const existing = await getIdeaById(id);
    if (!existing) throw new Error('Idea not found');

    const supabase = getSupabaseClient();
    const entityData = ideaToEntity(updates, existing);

    const { data, error } = await supabase
      .from('kg_entities')
      .update({
        ...entityData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return entityToIdea(data);
  } catch {
    initSampleIdeas();
    const existing = ideasCache.get(id);
    if (!existing) throw new Error('Idea not found');

    const updated: Idea = {
      ...existing,
      ...updates,
      tags: updates.tags ?? existing.tags,
      updated_at: new Date().toISOString(),
    };
    ideasCache.set(id, updated);
    return updated;
  }
}

export async function deleteIdea(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('kg_entities')
      .delete()
      .eq('id', id)
      .eq('type', ENTITY_TYPE);
  } catch {
    // Fallback to cache
  }
  ideasCache.delete(id);
}

export async function voteIdea(id: string, increment: number = 1): Promise<Idea> {
  const existing = await getIdeaById(id);
  if (!existing) throw new Error('Idea not found');

  return updateIdea(id, {
    votes: Math.max(0, existing.votes + increment),
  });
}

export async function updateIdeaStatus(id: string, status: IdeaStatus): Promise<Idea> {
  return updateIdea(id, { status });
}

export async function getIdeasSummary(): Promise<{
  total: number;
  byStatus: Record<IdeaStatus, number>;
  byImpact: Record<IdeaImpact, number>;
  topVoted: Idea[];
}> {
  const ideas = await getAllIdeas();

  const byStatus: Record<IdeaStatus, number> = {
    idea: 0,
    evaluating: 0,
    planned: 0,
    in_progress: 0,
    done: 0,
    rejected: 0,
  };

  const byImpact: Record<IdeaImpact, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const idea of ideas) {
    byStatus[idea.status]++;
    if (idea.impact) {
      byImpact[idea.impact]++;
    }
  }

  const topVoted = [...ideas]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  return {
    total: ideas.length,
    byStatus,
    byImpact,
    topVoted,
  };
}

// Ensure sample ideas are seeded if kg_entities is empty
export async function seedIdeasIfEmpty(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kg_entities')
      .select('id')
      .eq('type', ENTITY_TYPE)
      .contains('properties', { entity_subtype: ENTITY_SUBTYPE })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log('Seeding sample ideas to kg_entities...');
      for (const idea of sampleIdeas) {
        await createIdea(idea);
      }
      console.log(`Seeded ${sampleIdeas.length} ideas`);
    }
  } catch (e) {
    console.log('Could not seed ideas to Supabase, using in-memory cache');
    initSampleIdeas();
  }
}

// Export repository object
export const IdeasRepository = {
  findById: getIdeaById,
  findAll: getAllIdeas,
  findByStatus: getIdeasByStatus,
  create: createIdea,
  update: updateIdea,
  delete: deleteIdea,
  vote: voteIdea,
  updateStatus: updateIdeaStatus,
  getSummary: getIdeasSummary,
  seed: seedIdeasIfEmpty,
};
