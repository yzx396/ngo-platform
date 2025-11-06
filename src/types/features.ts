/**
 * Feature flag system types
 * Used for admin-controlled feature toggles
 */

/**
 * Feature flag record from database
 */
export interface FeatureFlag {
  id: string;
  feature_key: string;
  display_name: string;
  description: string | null;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

/**
 * Request body for creating a new feature flag
 */
export interface FeatureFlagCreateRequest {
  feature_key: string;
  display_name: string;
  description?: string;
  enabled?: boolean;
}

/**
 * Request body for updating a feature flag
 */
export interface FeatureFlagUpdateRequest {
  enabled: boolean;
}

/**
 * Map of feature keys to their enabled status
 * Used by frontend to check if features are enabled
 */
export interface EnabledFeatures {
  [key: string]: boolean;
}

/**
 * Normalize a feature flag from database row to typed object
 * Converts SQLite INTEGER (0/1) to boolean
 */
export function normalizeFeatureFlag(dbRow: unknown): FeatureFlag {
  const row = dbRow as Record<string, unknown>;
  return {
    id: row.id as string,
    feature_key: row.feature_key as string,
    display_name: row.display_name as string,
    description: row.description as string | null,
    enabled: Boolean(row.enabled), // SQLite stores as 0/1
    created_at: row.created_at as number,
    updated_at: row.updated_at as number,
  };
}

/**
 * Validate feature key format
 * Must be lowercase alphanumeric with underscores only
 */
export function isValidFeatureKey(key: string): boolean {
  return /^[a-z0-9_]+$/.test(key);
}
