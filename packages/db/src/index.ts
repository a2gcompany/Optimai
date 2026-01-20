// =============================================================================
// @optimai/db - Supabase database client and repositories
// =============================================================================

// Client
export { getSupabaseClient, getSupabaseAdmin, SupabaseClient } from './client';

// Database types
export type { Database, Json, Tables, InsertTables, UpdateTables } from './types';

// Repositories
export * from './repositories';
